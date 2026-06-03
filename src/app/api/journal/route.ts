import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { modules, notes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// POST /api/journal
// Generate AI study notes from module transcript
// Body: { moduleId: number, type: 'summary' | 'concepts' | 'questions' | 'full' }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { moduleId, type = 'full' } = body;

  if (!moduleId) {
    return NextResponse.json({ error: 'moduleId is required' }, { status: 400 });
  }

  // Get module with course info
  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, moduleId));

  if (!mod) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  // Read transcript
  let transcript = '';
  if (mod.transcriptPath && existsSync(mod.transcriptPath)) {
    transcript = readFileSync(mod.transcriptPath, 'utf-8');
  }

  if (!transcript && mod.summary) {
    transcript = mod.summary;
  }

  if (!transcript) {
    return NextResponse.json({
      error: 'No transcript or summary available for this module',
    }, { status: 400 });
  }

  // Build prompt based on type
  const prompts: Record<string, string> = {
    summary: `Сделай краткую выжимку материала (3-5 предложений). На русском.`,
    concepts: `Выдели 5-10 ключевых концепций/терминов из материала. Для каждой — краткое определение (1 предложение). На русском.`,
    questions: `Придумай 5 вопросов для самопроверки по материалу. Вопросы должны проверять понимание, а не запоминание. На русском.`,
    full: `Сделай структурированный конспект материала:
1. **Краткая выжимка** (3-5 предложений)
2. **Ключевые концепции** (5-10 терминов с определениями)
3. **Вопросы для самопроверки** (5 вопросов)
4. **Практические идеи** (2-3 идеи как применить)

На русском языке. Используй Markdown.`,
  };

  const promptText = prompts[type] || prompts.full;

  try {
    const hermesPrompt = `${promptText}

МАТЕРИАЛ (${mod.title}):
${transcript.substring(0, 8000)}`;

    const output = execSync(
      `hermes --raw "${hermesPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`,
      { timeout: 60000, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
    );

    // Save as a note linked to the module
    const noteTitle = type === 'full'
      ? `📒 Конспект: ${mod.title}`
      : `📝 ${type === 'summary' ? 'Выжимка' : type === 'concepts' ? 'Концепции' : 'Вопросы'}: ${mod.title}`;

    const notePath = `/notes/journal-${moduleId}-${type}-${Date.now()}.md`;

    await db.insert(notes).values({
      title: noteTitle,
      path: notePath,
      tags: 'journal,auto-generated',
      moduleId: mod.id,
      courseId: mod.courseId,
      aiSummary: type === 'full'
        ? output.trim().split('\n')[1]?.substring(0, 200) || ''
        : output.trim().substring(0, 200),
    });

    // Write markdown file
    const { writeFileSync, mkdirSync } = await import('fs');
    const baseDir = process.env.CORTEX_NOTES_DIR || path.join(process.cwd(), 'data', 'notes');
    mkdirSync(baseDir, { recursive: true });

    const fullContent = `# ${noteTitle}\n\n*Автосгенерировано Hermes, модуль: ${mod.title}*\n\n${output.trim()}`;
    const filePath = path.join(baseDir, `journal-${moduleId}-${type}-${Date.now()}.md`);
    writeFileSync(filePath, fullContent, 'utf-8');

    return NextResponse.json({
      ok: true,
      title: noteTitle,
      content: output.trim(),
      filePath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'AI generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
