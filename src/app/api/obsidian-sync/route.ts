import { NextRequest, NextResponse } from 'next/server';
import { syncObsidianVault, importMarkdownFile } from '@/lib/obsidian-sync';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, path } = body;

    if (action === 'sync') {
      const vaultPath = path || process.env.OBSIDIAN_VAULT || (process.env.HOME + '/dev/brain');
      const count = await syncObsidianVault(vaultPath);
      return NextResponse.json({ ok: true, imported: count, vaultPath });
    }

    if (action === 'import') {
      if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });
      const id = await importMarkdownFile(path);
      return NextResponse.json({ ok: true, id });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[obsidian-sync] error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    vaultPath: process.env.OBSIDIAN_VAULT || (process.env.HOME + '/dev/brain'),
    usage: 'POST { action: "sync" | "import", path?: string }',
  });
}
