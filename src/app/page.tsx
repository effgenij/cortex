import { Container, Title, SimpleGrid, Stack, Paper, Text } from '@mantine/core';
import { getCourses } from '@/lib/sync';
import { db } from '@/db';
import { userStreaks } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { CourseCard } from '@/components/CourseCard';
import { StreakWidget } from '@/components/StreakWidget';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const courses = await getCourses();

  // Count completed modules per course
  const courseProgress = await db.all<{ courseId: number; completed: number }>(
    sql`SELECT m.course_id as "courseId", COUNT(up.id) as completed
        FROM modules m
        LEFT JOIN user_progress up ON up.module_id = m.id AND up.status = 'completed'
        GROUP BY m.course_id`
  );

  const progressMap = new Map(courseProgress.map(r => [r.courseId, r.completed]));

  // Streaks
  const today = new Date().toISOString().slice(0, 10);
  const todayStreak = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.date, today))
    .get();

  // Count consecutive days
  const allStreaks = await db
    .select()
    .from(userStreaks)
    .orderBy(desc(userStreaks.date))
    .limit(365)
    .all();

  let streak = 0;
  const todayDate = new Date(today);
  for (let i = 0; i < allStreaks.length; i++) {
    const expected = new Date(todayDate);
    expected.setDate(expected.getDate() - i);
    if (allStreaks[i].date === expected.toISOString().slice(0, 10)) {
      streak++;
    } else {
      break;
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>🧠 Cortex</Title>

        <StreakWidget
          currentStreak={streak}
          todayModules={todayStreak?.modulesCompleted ?? 0}
          todayMinutes={todayStreak?.minutesStudied ?? 0}
        />

        <Title order={2}>Курсы</Title>

        {courses.length === 0 ? (
          <Paper p="xl" withBorder>
            <Text c="dimmed" ta="center">
              Курсы не найдены. Добавьте видео в {process.env.COURSES_DIR ?? '/root/courses'}
            </Text>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {courses.map(c => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                description={c.description}
                totalModules={c.totalModules ?? 0}
                completedModules={progressMap.get(c.id) ?? 0}
                language={c.language}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
