import { NextRequest, NextResponse } from 'next/server';
import { HermesService } from '@/core/ai/hermes';

const hermes = new HermesService();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { repoPath, branch } = body;

    if (!repoPath || !branch) {
      return NextResponse.json({ error: 'repoPath and branch are required' }, { status: 400 });
    }

    const review = await hermes.reviewPR(repoPath, branch);
    return NextResponse.json(review);
  } catch (err) {
    console.error('[pr-review] error:', err);
    return NextResponse.json(
      { error: 'PR review failed. Make sure gh CLI is authenticated and the repo exists.' },
      { status: 503 }
    );
  }
}
