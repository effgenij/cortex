import { NextRequest, NextResponse } from 'next/server';
import { HermesService } from '@/core/ai/hermes';

const hermes = new HermesService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, moduleId, courseTitle, moduleTitle, transcriptSnippet, history } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const response = await hermes.chat(
      {
        moduleTitle: moduleTitle ?? 'Unknown module',
        courseTitle: courseTitle ?? 'Unknown course',
        transcriptSnippet,
        previousMessages: history ?? [],
      },
      message
    );

    return NextResponse.json(response);
  } catch (err) {
    console.error('[chat] error:', err);
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 }
    );
  }
}
