import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents, tasks } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// GET /api/calendar?from=2026-06-01&to=2026-06-30
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || sql`date('now')`;
  const to = searchParams.get('to') || sql`date('now', '+30 days')`;

  const result = await db
    .select()
    .from(calendarEvents)
    .leftJoin(tasks, eq(calendarEvents.taskId, tasks.id))
    .where(
      and(
        gte(calendarEvents.startDate, from as string),
        lte(calendarEvents.startDate, to as string)
      )
    )
    .orderBy(calendarEvents.startDate);

  const items = result.map((r) => ({
    ...r.calendar_events,
    task: r.tasks,
  }));

  return NextResponse.json(items);
}

// POST /api/calendar
export async function POST(request: NextRequest) {
  const body = await request.json();

  const [event] = await db
    .insert(calendarEvents)
    .values({
      title: body.title,
      description: body.description || null,
      startDate: body.startDate,
      endDate: body.endDate || null,
      allDay: body.allDay || false,
      taskId: body.taskId || null,
    })
    .returning();

  return NextResponse.json(event, { status: 201 });
}
