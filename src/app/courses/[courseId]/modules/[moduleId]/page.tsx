import { Container, Title, Text, Stack, Group, Button, Badge, Grid, Paper } from '@mantine/core';
import Link from 'next/link';
import { getModule, getCourse, syncCourses } from '@/lib/sync';
import { db } from '@/db';
import { userProgress, chatMessages, chatThreads } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { VideoPlayer } from '@/components/VideoPlayer';
import { ChatPanel } from '@/components/ChatPanel';
import { MarkCompleteButton } from '@/components/MarkCompleteButton';
import { readFile } from 'fs/promises';

export const dynamic = 'force-dynamic';

export default async function ModulePage({ params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  const { courseId, moduleId } = await params;
  await syncCourses();
  const mod = await getModule(parseInt(moduleId));
  const course = await getCourse(parseInt(courseId));

  if (!mod || !course) {
    return (
      <Container py="xl">
        <Text>Модуль не найден</Text>
      </Container>
    );
  }

  // Load transcript if available
  let transcriptSnippet: string | undefined;
  if (mod.transcriptPath) {
    try {
      const raw = await readFile(mod.transcriptPath, 'utf-8');
      transcriptSnippet = raw.slice(0, 4000); // first 4K chars
    } catch {
      // transcript not readable
    }
  }

  // Load existing chat thread
  const thread = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.moduleId, mod.id))
    .get();

  const history = thread
    ? await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.threadId, thread.id))
        .orderBy(chatMessages.createdAt)
        .limit(50)
        .all()
    : [];

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group>
          <Button component={Link} href={`/courses/${course.id}`} variant="subtle">
            ← К курсу
          </Button>
        </Group>

        <Title order={2}>{mod.orderIndex + 1}. {mod.title}</Title>
        <Text c="dimmed" size="sm">{course.title}</Text>

        <Grid>
          {/* Left: Video + summary */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md">
              <VideoPlayer src={mod.videoPath} title={mod.title} />

              {mod.summary ? (
                <Paper p="md" withBorder>
                  <Text fw={500} mb="xs">📝 Выжимка</Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{mod.summary}</Text>
                </Paper>
              ) : transcriptSnippet ? (
                <Paper p="md" withBorder>
                  <Text fw={500} mb="xs">📄 Расшифровка (фрагмент)</Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                    {transcriptSnippet}
                  </Text>
                </Paper>
              ) : null}

              <MarkCompleteButton moduleId={mod.id} />
            </Stack>
          </Grid.Col>

          {/* Right: Chat */}
          <Grid.Col span={{ base: 12, md: 5 }} style={{ minHeight: 500 }}>
            <ChatPanel
              courseTitle={course.title}
              moduleTitle={mod.title}
              transcriptSnippet={transcriptSnippet}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

