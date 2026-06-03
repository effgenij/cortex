import { NextResponse } from 'next/server';
import { db } from '@/db';
import {
  courses,
  tasks,
  calendarEvents,
  notes,
  inboxItems,
  userStreaks,
  knowledgeExtracts,
} from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// GET /api/briefing — Daily Briefing 2.0
export async function GET() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // ── Streak ──
  const [todayStreak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.date, today as unknown as string));

  // ── Courses ──
  const activeCourses = await db
    .select({
      id: courses.id,
      title: courses.title,
      total: courses.totalModules,
      completed: courses.completedModules,
    })
    .from(courses)
    .where(
      sql`${courses.completedModules} < ${courses.totalModules} OR ${courses.totalModules} = 0`
    )
    .limit(5);

  const courseList = activeCourses.map((c) => ({
    id: c.id,
    title: c.title,
    progress: (c.total ?? 0) > 0 ? Math.round(((c.completed ?? 0) / (c.total ?? 1)) * 100) : 0,
  }));

  // ── Tasks ──
  const todayTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, today),
        sql`${tasks.status} != 'done' AND ${tasks.status} != 'cancelled'`
      )
    )
    .orderBy(tasks.priority);

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

  // ── Events ──
  const todayEvents = await db
    .select()
    .from(calendarEvents)
    .where(sql`date(${calendarEvents.startDate}) = date('now')`)
    .orderBy(calendarEvents.startDate);

  // ── Recent notes ──
  const recentNotes = await db
    .select({ id: notes.id, title: notes.title, updatedAt: notes.updatedAt })
    .from(notes)
    .orderBy(desc(notes.updatedAt))
    .limit(5);

  // ── Inbox ──
  const unprocessedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(inboxItems)
    .where(eq(inboxItems.status, 'new'));

  const recentExtracts = await db
    .select({
      id: knowledgeExtracts.id,
      content: knowledgeExtracts.content,
      type: knowledgeExtracts.type,
    })
    .from(knowledgeExtracts)
    .orderBy(desc(knowledgeExtracts.createdAt))
    .limit(5);

  // ── Assemble ──
  return NextResponse.json({
    date: today,
    greeting: getGreeting(),

    streak: todayStreak
      ? {
          current: todayStreak.modulesCompleted,
          minutes: todayStreak.minutesStudied,
        }
      : null,

    courses: {
      active: courseList,
      total: activeCourses.length,
    },

    tasks: {
      today: todayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
      })),
      overdue: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
      })),
    },

    events: todayEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      allDay: e.allDay,
    })),

    notes: {
      recent: recentNotes,
    },

    inbox: {
      unprocessed: unprocessedCount[0]?.count || 0,
    },

    knowledge: {
      recentInsights: recentExtracts,
    },
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '🌙 Доброй ночи';
  if (hour < 12) return '☀️ Доброе утро';
  if (hour < 18) return '🌤 Добрый день';
  return '🌆 Добрый вечер';
}
