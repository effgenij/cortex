import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  courses,
  tasks,
  calendarEvents,
  notes,
  inboxItems,
  userStreaks,
} from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { execSync } from 'child_process';

// POST /api/orchestrator
// Unified entry point: cortex ask "question"
export async function POST(request: NextRequest) {
  const { question } = await request.json();

  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'question is required' }, { status: 400 });
  }

  // 1. Gather cross-module context
  const today = new Date().toISOString().split('T')[0];

  // Active courses
  const activeCourses = await db
    .select({
      id: courses.id,
      title: courses.title,
      progress: sql<number>`CASE WHEN ${courses.totalModules} > 0 THEN ROUND(CAST(${courses.completedModules} AS REAL) / ${courses.totalModules} * 100) ELSE 0 END`,
    })
    .from(courses)
    .where(
      sql`${courses.completedModules} < ${courses.totalModules} OR ${courses.totalModules} = 0`
    )
    .limit(5);

  // Today's tasks
  const todayTasks = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.dueDate, today),
        sql`${tasks.status} != 'done' AND ${tasks.status} != 'cancelled'`
      )
    )
    .orderBy(tasks.priority)
    .limit(10);

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
    .limit(5);

  // Today's events
  const todayEvents = await db
    .select()
    .from(calendarEvents)
    .where(sql`date(${calendarEvents.startDate}) = date('now')`)
    .limit(5);

  // Recent notes
  const recentNotes = await db
    .select({ id: notes.id, title: notes.title, tags: notes.tags })
    .from(notes)
    .orderBy(desc(notes.updatedAt))
    .limit(5);

  // Unprocessed inbox
  const unprocessedInbox = await db
    .select({ id: inboxItems.id, title: inboxItems.title, sourceType: inboxItems.sourceType })
    .from(inboxItems)
    .where(eq(inboxItems.status, 'new'))
    .limit(3);

  // Streak
  const [todayStreak] = await db
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.date, today as unknown as string));

  // 2. Build context string for Hermes
  const ctxParts: string[] = [];

  if (activeCourses.length > 0) {
    ctxParts.push('=== КУРСЫ ===');
    for (const c of activeCourses) {
      ctxParts.push(`- ${c.title} (${c.progress}% пройдено)`);
    }
  }

  if (overdueTasks.length > 0) {
    ctxParts.push('\n=== ПРОСРОЧЕННЫЕ ЗАДАЧИ ===');
    for (const t of overdueTasks) {
      ctxParts.push(`- [#${t.id}] ${t.title}`);
    }
  }

  if (todayTasks.length > 0) {
    ctxParts.push('\n=== ЗАДАЧИ НА СЕГОДНЯ ===');
    for (const t of todayTasks) {
      ctxParts.push(`- [#${t.id}] ${t.title}`);
    }
  }

  if (todayEvents.length > 0) {
    ctxParts.push('\n=== СОБЫТИЯ СЕГОДНЯ ===');
    for (const e of todayEvents) {
      ctxParts.push(`- ${e.title}`);
    }
  }

  if (recentNotes.length > 0) {
    ctxParts.push('\n=== ПОСЛЕДНИЕ ЗАМЕТКИ ===');
    for (const n of recentNotes) {
      ctxParts.push(`- ${n.title}${n.tags ? ` [${n.tags}]` : ''}`);
    }
  }

  if (todayStreak) {
    ctxParts.push(`\nСегодня: ${todayStreak.modulesCompleted} модулей, ${todayStreak.minutesStudied} мин учёбы`);
  }

  if (unprocessedInbox.length > 0) {
    ctxParts.push(`\nНовых в inbox: ${unprocessedInbox.length}`);
  }

  const context = ctxParts.join('\n');

  // 3. Call Hermes CLI
  try {
    const prompt = `Ты — AI-ассистент рабочего пространства Cortex. У пользователя есть курсы, задачи, заметки, календарь. Ответь на вопрос, учитывая контекст ниже.

КОНТЕКСТ:
${context || '(пусто — данных пока нет)'}

ВОПРОС: ${question}

Ответь кратко и по делу, на русском. Если нужна информация, которой нет в контексте — скажи об этом.`;

    const hermesOutput = execSync(
      `hermes --raw "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { timeout: 30000, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );

    return NextResponse.json({
      answer: hermesOutput.trim(),
      contextUsed: {
        courses: activeCourses.length,
        tasks: todayTasks.length + overdueTasks.length,
        events: todayEvents.length,
        notes: recentNotes.length,
        inbox: unprocessedInbox.length,
      },
    });
  } catch (error) {
    // Graceful degradation — return context-only response
    return NextResponse.json({
      answer: `(Hermes недоступен) Вот что я знаю:\n\n${context || 'Пока данных нет.'}`,
      contextUsed: {
        courses: activeCourses.length,
        tasks: todayTasks.length + overdueTasks.length,
        events: todayEvents.length,
        notes: recentNotes.length,
        inbox: unprocessedInbox.length,
      },
      error: String(error),
    });
  }
}
