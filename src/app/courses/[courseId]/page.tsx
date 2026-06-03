import { Container, Title, Text, Stack, SimpleGrid, Paper, Badge, Group, Button, Progress as MProgress } from '@mantine/core';
import Link from 'next/link';
import { getCourse, getModules, syncCourses } from '@/lib/sync';
import { db } from '@/db';
import { userProgress } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  await syncCourses();
  const course = await getCourse(parseInt(courseId));
  if (!course) {
    return (
      <Container py="xl">
        <Text>Курс не найден</Text>
      </Container>
    );
  }

  const mods = await getModules(course.id);

  // Get progress for all modules in this course
  const moduleIds = mods.map(m => m.id);
  const progressRows = moduleIds.length > 0
    ? await db
        .select()
        .from(userProgress)
        .where(inArray(userProgress.moduleId, moduleIds))
        .all()
    : [];

  const progressMap = new Map(progressRows.map(p => [p.moduleId, p]));

  const completed = mods.filter(m => progressMap.get(m.id)?.status === 'completed').length;

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group>
          <Button component={Link} href="/" variant="subtle">
            ← Назад
          </Button>
        </Group>

        <Title order={1}>{course.title}</Title>
        {course.description && <Text c="dimmed">{course.description}</Text>}

        <Group>
          <Badge size="lg" variant="light">
            {completed}/{mods.length} завершено
          </Badge>
          {course.language && (
            <Badge size="lg" variant="outline">
              {course.language.toUpperCase()}
            </Badge>
          )}
        </Group>

        <MProgress value={mods.length > 0 ? (completed / mods.length) * 100 : 0} />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {mods.map(mod => {
            const prog = progressMap.get(mod.id);
            const isCompleted = prog?.status === 'completed';
            return (
              <Paper
                key={mod.id}
                p="md"
                withBorder
                style={{ opacity: isCompleted ? 0.6 : 1 }}
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>
                      {mod.orderIndex + 1}. {mod.title}
                    </Text>
                    {isCompleted && <Badge color="green">✓</Badge>}
                  </Group>
                  {mod.transcriptPath && (
                    <Badge variant="light" size="sm" color="blue">
                      расшифровка
                    </Badge>
                  )}
                  <Button
                    component={Link}
                    href={`/courses/${course.id}/modules/${mod.id}`}
                    variant="light"
                    fullWidth
                  >
                    {isCompleted ? 'Пересмотреть' : 'Смотреть'}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
