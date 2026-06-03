import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { calendarEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/calendar/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (body.allDay !== undefined) updates.allDay = body.allDay;
  if (body.taskId !== undefined) updates.taskId = body.taskId;

  updates.updatedAt = new Date().toISOString();

  const [event] = await db
    .update(calendarEvents)
    .set(updates)
    .where(eq(calendarEvents.id, parseInt(id)))
    .returning();

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json(event);
}

// DELETE /api/calendar/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db.delete(calendarEvents).where(eq(calendarEvents.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}
