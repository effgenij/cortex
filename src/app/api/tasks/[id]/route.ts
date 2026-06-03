import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

// PATCH /api/tasks/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
  if (body.projectId !== undefined) updates.projectId = body.projectId;

  updates.updatedAt = new Date().toISOString();

  const [task] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, parseInt(id)))
    .returning();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(task);
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db.delete(tasks).where(eq(tasks.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}
