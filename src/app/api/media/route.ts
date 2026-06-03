import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { extname } from 'path';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ts': 'video/mp2t',
  '.avi': 'video/x-msvideo',
  '.vtt': 'text/vtt',
  '.srt': 'text/plain',
  '.txt': 'text/plain',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json({ error: 'path is required' }, { status: 400 });
  }

  // Security: only allow paths under /root/courses
  if (!rawPath.startsWith('/root/courses') && !rawPath.startsWith('/home/')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const fileStat = await stat(rawPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    const ext = extname(rawPath).toLowerCase();
    const mimeType = MIME[ext] ?? 'application/octet-stream';

    // For small files (< 100MB), read into buffer
    if (fileStat.size < 100 * 1024 * 1024) {
      const buffer = await readFile(rawPath);
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(fileStat.size),
          'Accept-Ranges': 'bytes',
        },
      });
    }

    // For large files, stream
    const stream = createReadStream(rawPath);
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileStat.size),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch {
    return NextResponse.json({ error: 'read error' }, { status: 500 });
  }
}
