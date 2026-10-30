import { NextRequest, NextResponse } from 'next/server';
import { getMediaById } from '@/lib/media';

/**
 * Serves an uploaded file's actual bytes straight out of the database
 * (the `data` column — see src/lib/media.ts's comment for why this is
 * no longer a disk read). Public/unauthenticated by design — media is
 * meant to end up embedded in public content (a blog cover image, a
 * service icon), so gating this behind a session would break every
 * such use once published. Only the upload/delete actions require
 * admin auth; reading a specific, already-known media id is equivalent
 * to reading any other public asset URL.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getMediaById(id);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!row.data) {
    // Uploaded before the `data` column existed — its disk file is
    // presumed gone after any deploy since (see src/lib/media.ts).
    // Nothing to recover it from; the admin needs to re-upload it.
    return NextResponse.json({ error: 'File is no longer available — please re-upload it.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.data), {
    headers: {
      'Content-Type': row.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
