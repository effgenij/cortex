import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, projects } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';

// GET /api/tasks?status=todo&projectId=1&due=today
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const projectId = searchParams.get('projectId');
  const due = searchParams.get('due'); // 'today' | 'week' | 'overdue'

  const conditions = [];

  if (status) {
    conditions.push(eq(tasks.status, status));
  }

  if (projectId) {
    conditions.push(eq(tasks.projectId, parseInt(projectId)));
  }

  if (due === 'today') {
    conditions.push(eq(tasks.dueDate, sql`date('now')`));
  } else if (due === 'week') {
    conditions.push(
      sql`${tasks.dueDate} >= date('now') AND ${tasks.dueDate} <= date('now', '+7 days')`
    );
  } else if (due === 'overdue') {
    conditions.push(
      sql`${tasks.dueDate} < date('now') AND ${tasks.status} != 'done' AND ${tasks.status} != 'cancelled'`
    );
  }

  const result = await db
    .select()
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.priority), asc(tasks.dueDate));

  const items = result.map((r) => ({
    ...r.tasks,
    project: r.projects,
  }));

  return NextResponse.json(items);
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  const body = await request.json();

  const [task] = await db
    .insert(tasks)
    .values({
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      priority: body.priority || 2,
      dueDate: body.dueDate || null,
      projectId: body.projectId || null,
      courseId: body.courseId || null,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
