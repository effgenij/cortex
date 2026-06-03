import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inboxItems, knowledgeExtracts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { execSync } from 'child_process';

// GET /api/inbox?status=new
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const items = await db
    .select()
    .from(inboxItems)
    .where(status ? eq(inboxItems.status, status) : undefined)
    .orderBy(desc(inboxItems.createdAt))
    .limit(50);

  return NextResponse.json(items);
}

// POST /api/inbox — add item
export async function POST(request: NextRequest) {
  const body = await request.json();

  const [item] = await db
    .insert(inboxItems)
    .values({
      title: body.title,
      url: body.url || null,
      sourceType: body.sourceType || 'article',
      status: 'new',
      metadata: body.metadata || null,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}

// PATCH /api/inbox — process item (extract insights via Hermes)
// Body: { id: number, action: 'process' | 'archive' }
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  if (body.action === 'archive') {
    await db
      .update(inboxItems)
      .set({ status: 'archived' })
      .where(eq(inboxItems.id, body.id));

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'process') {
    // Mark as in_progress
    await db
      .update(inboxItems)
      .set({ status: 'in_progress' })
      .where(eq(inboxItems.id, body.id));

    // Get the item
    const [item] = await db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.id, body.id));

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Call Hermes to generate summary and extract insights
    try {
      const prompt = `Прочитай следующее и (1) напиши краткую выжимку (2-3 предложения), (2) выдели 2-5 ключевых инсайтов/цитат. Ответь строго в JSON формате: {"summary": "...", "insights": ["...", "..."]}

ЗАГОЛОВОК: ${item.title}
${item.url ? `URL: ${item.url}` : ''}

На русском языке.`;

      const output = execSync(
        `hermes --raw "${prompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        { timeout: 30000, encoding: 'utf-8', maxBuffer: 1024 * 1024 }
      );

      // Parse Hermes output
      let parsed: { summary?: string; insights?: string[] } = {};
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: use raw output as summary
        parsed = { summary: output.trim().substring(0, 500) };
      }

      // Save summary and insights
      const summary = parsed.summary || output.trim().substring(0, 500);
      const insights = parsed.insights || [];

      await db
        .update(inboxItems)
        .set({
          summary,
          extractedInsights: JSON.stringify(insights),
          status: 'processed',
          processedAt: new Date().toISOString(),
        })
        .where(eq(inboxItems.id, body.id));

      // Save individual insights as knowledge extracts
      for (const insight of insights) {
        await db.insert(knowledgeExtracts).values({
          inboxItemId: body.id,
          content: insight,
          type: 'insight',
        });
      }

      return NextResponse.json({
        ok: true,
        summary,
        insights,
      });
    } catch (error) {
      // Rollback status
      await db
        .update(inboxItems)
        .set({ status: 'new' })
        .where(eq(inboxItems.id, body.id));

      return NextResponse.json(
        { error: 'Processing failed', details: String(error) },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/inbox?id=1
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  await db.delete(inboxItems).where(eq(inboxItems.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}
