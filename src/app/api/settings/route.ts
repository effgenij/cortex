import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SETTINGS_PATH = join(
  process.env.HOME ?? '/root',
  '.cortex',
  'settings.json'
);

interface Settings {
  coursesDir?: string;
  cortexDir?: string;
  theme?: string;
  autoSync?: boolean;
}

async function readSettings(): Promise<Settings> {
  try {
    if (!existsSync(SETTINGS_PATH)) return {};
    const raw = await readFile(SETTINGS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readSettings();

    const merged: Settings = {
      ...current,
      ...body,
    };

    // Ensure directory exists
    const dir = join(process.env.HOME ?? '/root', '.cortex');
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2));
    return NextResponse.json({ ok: true, settings: merged });
  } catch (err) {
    console.error('[settings] error:', err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
