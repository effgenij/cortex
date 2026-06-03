import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, calendarEvents, courses, userStreaks } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

// GET /api/today — сводка на сегодня
export async function GET() {
  // Tasks due today
  const todayTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, sql`date('now')`),
        sql`${tasks.status} != 'done' AND ${tasks.status} != 'cancelled'`
      )
    )
    .orderBy(tasks.priority);

  // Overdue tasks
  const overdueTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        sql`${tasks.dueDate} < date('now')`,
        sql`${tasks.status} != 'done' AND ${tasks.status} != 'cancelled'`
      )
    )
    .orderBy(tasks.priority);

  // Events today
  const todayEvents = await db
    .select()
    .from(calendarEvents)
    .where(
      sql`date(${calendarEvents.startDate}) = date('now')`
    )
    .orderBy(calendarEvents.startDate);

  // Active courses (not fully completed)
  const activeCourses = await db
    .select()
    .from(courses)
    .where(sql`${courses.completedModules} < ${courses.totalModules} OR ${courses.totalModules} = 0`)
    .orderBy(courses.updatedAt);

  // Streak info
  const today = sql`date('now')`.mapWith(String);
  const [todayStreak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.date, today as unknown as string));

  return NextResponse.json({
    date: new Date().toISOString().split('T')[0],
    tasks: {
      today: todayTasks,
      overdue: overdueTasks,
    },
    events: todayEvents,
    courses: activeCourses.map((c) => ({
      id: c.id,
      title: c.title,
      progress: (c.totalModules ?? 0) > 0
        ? Math.round(((c.completedModules ?? 0) / (c.totalModules ?? 1)) * 100)
        : 0,
    })),
    streak: todayStreak
      ? { modules: todayStreak.modulesCompleted, minutes: todayStreak.minutesStudied }
      : null,
  });
}
