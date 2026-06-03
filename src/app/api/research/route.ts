import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { modules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { execSync } from 'child_process';

// POST /api/research
// Deep research: gather external sources per module
export async function POST(request: NextRequest) {
  const { moduleId } = await request.json();

  if (!moduleId) {
    return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
  }

  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId));

  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const prompt = `Проведи глубокое исследование по теме "${mod.title}".

${mod.summary ? `Контекст из курса: ${mod.summary}` : ''}

Найди и структурируй:
1. **Лучшие статьи/туториалы** (3-5 ссылок с кратким описанием)
2. **Ключевые концепции** которые стоит изучить дополнительно
3. **Известные инструменты/библиотеки** по теме (если применимо)
4. **Практические проекты/задачи** для закрепления
5. **Альтернативные точки зрения** или контроверсии в теме

Используй web_search для поиска актуальной информации.
Формат: Markdown, на русском. Будь конкретен — давай ссылки и названия.`;

  try {
    const output = execSync(
      `hermes --raw "${prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { timeout: 90000, encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 }
    );

    return NextResponse.json({
      ok: true,
      moduleTitle: mod.title,
      content: output.trim(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Research failed', details: String(error) },
      { status: 500 }
    );
  }
}
