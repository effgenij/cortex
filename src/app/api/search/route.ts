import { NextRequest, NextResponse } from 'next/server';
import BetterSqlite3 from 'better-sqlite3';
import { existsSync, readFileSync } from 'fs';

const DB_PATH = 'cortex.db';

// GET /api/search?q=query
// Full-text search across all transcripts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], query: '' });
  }

  const db = new BetterSqlite3(DB_PATH);
  db.pragma('journal_mode = WAL');

  try {
    // Check if FTS table exists
    const ftsExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='transcript_fts'")
      .get();

    if (!ftsExists) {
      // Create FTS table on first use
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS transcript_fts USING fts5(
          module_id,
          course_id,
          title,
          content,
          tokenize='unicode61'
        );
      `);
    }

    // Check if we need to index (FTS table empty or stale)
    const ftsCount = db.prepare('SELECT count(*) as c FROM transcript_fts').get() as { c: number };
    if (ftsCount.c === 0) {
      // Index all transcripts
      const modules = db.prepare(`
        SELECT m.id, m.course_id, m.title, m.transcript_path, m.summary
        FROM modules m
      `).all() as Array<{
        id: number;
        course_id: number;
        title: string;
        transcript_path: string | null;
        summary: string | null;
      }>;

      const insert = db.prepare(
        'INSERT INTO transcript_fts(module_id, course_id, title, content) VALUES (?, ?, ?, ?)'
      );

      const indexAll = db.transaction(() => {
        for (const mod of modules) {
          let content = mod.summary || '';
          if (mod.transcript_path && existsSync(mod.transcript_path)) {
            try {
              content = readFileSync(mod.transcript_path, 'utf-8').substring(0, 50000);
            } catch {
              // skip unreadable
            }
          }
          if (content) {
            insert.run(mod.id, mod.course_id, mod.title, content);
          }
        }
      });
      indexAll();
    }

    // Search
    // Sanitize query for FTS5
    const safeQuery = query.replace(/['"*]/g, '').trim();
    if (!safeQuery) {
      return NextResponse.json({ results: [], query });
    }

    const results = db
      .prepare(
        `SELECT module_id, course_id, title, snippet(transcript_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
         FROM transcript_fts
         WHERE transcript_fts MATCH ?
         ORDER BY rank
         LIMIT 20`
      )
      .all(safeQuery.split(/\s+/).map((w) => `"${w}"`).join(' OR ')) as Array<{
      module_id: number;
      course_id: number;
      title: string;
      snippet: string;
    }>;

    return NextResponse.json({
      query,
      count: results.length,
      results: results.map((r) => ({
        moduleId: r.module_id,
        courseId: r.course_id,
        title: r.title,
        snippet: r.snippet,
      })),
    });
  } finally {
    db.close();
  }
}

// POST /api/search — reindex
export async function POST() {
  const db = new BetterSqlite3(DB_PATH);
  db.pragma('journal_mode = WAL');

  try {
    // Drop and recreate FTS table
    db.exec('DROP TABLE IF EXISTS transcript_fts');
    db.exec(`
      CREATE VIRTUAL TABLE transcript_fts USING fts5(
        module_id,
        course_id,
        title,
        content,
        tokenize='unicode61'
      );
    `);

    return NextResponse.json({ ok: true, message: 'FTS index recreated. Search to trigger reindex.' });
  } finally {
    db.close();
  }
}
