import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userProgress, userStreaks } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { moduleId, status, notes } = body;

    if (!moduleId || !status) {
      return NextResponse.json({ error: 'moduleId and status are required' }, { status: 400 });
    }

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 });
    }

    // Upsert progress
    const existing = await db
      .select({ id: userProgress.id })
      .from(userProgress)
      .where(eq(userProgress.moduleId, moduleId))
      .get();

    if (existing) {
      await db
        .update(userProgress)
        .set({
          status,
          notes: notes ?? undefined,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(userProgress.id, existing.id));
    } else {
      await db.insert(userProgress).values({
        moduleId,
        status,
        notes,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      });
    }

    // Update today's streak
    const today = new Date().toISOString().slice(0, 10);
    const todayStreak = await db
      .select()
      .from(userStreaks)
      .where(eq(userStreaks.date, today))
      .get();

    if (todayStreak) {
      await db
        .update(userStreaks)
        .set({
          modulesCompleted: (todayStreak.modulesCompleted ?? 0) + (status === 'completed' ? 1 : 0),
          // rough estimate: 10 min per module marked complete
          minutesStudied: (todayStreak.minutesStudied ?? 0) + (status === 'completed' ? 10 : 0),
        })
        .where(eq(userStreaks.date, today));
    } else {
      await db.insert(userStreaks).values({
        date: today,
        modulesCompleted: status === 'completed' ? 1 : 0,
        minutesStudied: status === 'completed' ? 10 : 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[progress] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get('moduleId');

  if (moduleId) {
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.moduleId, parseInt(moduleId)))
      .get();
    return NextResponse.json(progress ?? null);
  }

  const all = await db.select().from(userProgress).all();
  return NextResponse.json(all);
}
