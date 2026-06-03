import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notes, noteLinks } from '@/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { writeFile, readFile, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const NOTES_DIR = join(process.env.HOME ?? '/root', '.cortex', 'notes');

async function ensureDir() {
  if (!existsSync(NOTES_DIR)) await mkdir(NOTES_DIR, { recursive: true });
}

// ── GET /api/notes — list notes ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const query = searchParams.get('q');
  const tag = searchParams.get('tag');
  const courseId = searchParams.get('courseId');

  if (id) {
    const note = await db.select().from(notes).where(eq(notes.id, parseInt(id))).get();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Read markdown content
    try {
      const content = await readFile(note.path, 'utf-8');
      return NextResponse.json({ ...note, content });
    } catch {
      return NextResponse.json({ ...note, content: '' });
    }
  }

  const q = db.select().from(notes).$dynamic();
  if (query) q.where(or(like(notes.title, `%${query}%`), like(notes.tags, `%${query}%`)));
  if (tag) q.where(like(notes.tags, `%${tag}%`));
  if (courseId) q.where(eq(notes.courseId, parseInt(courseId)));

  const result = await q.orderBy(notes.updatedAt).all();
  return NextResponse.json(result);
}

// ── POST /api/notes — create/update note ──────────────────
export async function POST(req: NextRequest) {
  await ensureDir();
  const body = await req.json();
  const { id, title, content, tags, courseId, moduleId } = body;

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const slug = title.toLowerCase().replace(/[^a-zа-яё0-9]+/g, '-').replace(/^-|-$/g, '');
  const filePath = join(NOTES_DIR, `${slug}.md`);

  // Write markdown to disk
  await writeFile(filePath, content ?? '', 'utf-8');

  if (id) {
    // Update
    await db.update(notes).set({
      title,
      tags: tags ?? null,
      courseId: courseId ?? null,
      moduleId: moduleId ?? null,
      updatedAt: new Date().toISOString(),
    }).where(eq(notes.id, id));
    return NextResponse.json({ ok: true, id });
  } else {
    // Create
    const result = await db.insert(notes).values({
      title,
      path: filePath,
      tags,
      courseId,
      moduleId,
    }).returning({ id: notes.id }).get();
    return NextResponse.json({ ok: true, id: result!.id });
  }
}

// ── DELETE /api/notes?id=X ────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const note = await db.select().from(notes).where(eq(notes.id, parseInt(id))).get();
  if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Delete markdown file
  try { await unlink(note.path); } catch { /* file may not exist */ }

  // Delete links
  await db.delete(noteLinks).where(
    or(eq(noteLinks.sourceNoteId, note.id), eq(noteLinks.targetNoteId, note.id))
  );

  await db.delete(notes).where(eq(notes.id, note.id));
  return NextResponse.json({ ok: true });
}
