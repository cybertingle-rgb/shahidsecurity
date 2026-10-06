import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { getMediaById } from '@/lib/media';

/**
 * Serves an uploaded file's actual bytes from disk. Public/unauthenticated
 * by design — media is meant to end up embedded in public content (a
 * blog cover image, a service icon), so gating this behind a session
 * would break every such use once published. Only the upload/delete
 * actions require admin auth; reading a specific, already-known media
 * id is equivalent to reading any other public asset URL.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getMediaById(id);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bytes = await readFile(row.storagePath).catch(() => null);
  if (!bytes) {
    return NextResponse.json({ error: 'File missing on disk' }, { status: 404 });
  }

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': row.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
