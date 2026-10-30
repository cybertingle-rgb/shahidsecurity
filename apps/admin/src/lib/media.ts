import path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { media, type Media } from '@/db/schema';

/**
 * storagePath is now a display-only label (see the `data` column on
 * the media table, src/db/schema/content.ts) — never actually read
 * from or written to disk. It used to be: local disk under
 * `data/media-uploads`, chosen specifically to sit outside .next and
 * outside anything Next's standalone build traces/bundles. That
 * protected it from the BUILD process, but not from this host's actual
 * DEPLOY mechanism — confirmed directly (Hostinger's Git pipeline
 * swaps in a brand-new versioned directory, `hbuilds/versions/<uuid>`,
 * on every deploy) that the entire app directory, not just `.next`, is
 * replaced wholesale. A file written here during one deployment is
 * simply gone — not deleted, just never present — in the next one,
 * which is exactly what made a course thumbnail vanish after a routine
 * redeploy. The database is the one thing on this host both apps write
 * to that the deploy pipeline never touches, so file bytes now live
 * there (longblob column) instead.
 */
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'media-uploads');

// Allowlist only — no executable, script, or SVG (SVGs can carry
// embedded script/XSS, so they're excluded even though they're images).
const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export class InvalidUploadError extends Error {}

function sanitizeFileNameForDisplay(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/**
 * Validates an uploaded file and records it — bytes and all — in
 * `media`. Never trusts the browser-supplied filename for the stored
 * identity (that's always `<uuid><allowlisted-extension>`, used only
 * as a cosmetic label) or the browser-supplied MIME type's extension —
 * only this module's own allowlist decides the extension, closing the
 * classic "upload shell.php.jpg" style bypass.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalFileName: string,
  mimeType: string,
  uploadedByUserId: string,
): Promise<Media> {
  if (buffer.length === 0) throw new InvalidUploadError('File is empty.');
  if (buffer.length > MAX_FILE_SIZE_BYTES) throw new InvalidUploadError('File exceeds the 10MB limit.');

  const extension = ALLOWED_MIME_TYPES[mimeType];
  if (!extension) throw new InvalidUploadError(`File type "${mimeType}" is not allowed.`);

  const id = crypto.randomUUID();
  const storedFileName = `${id}${extension}`;
  const storagePath = path.join(UPLOAD_DIR, storedFileName);

  await db.insert(media).values({
    id,
    fileName: sanitizeFileNameForDisplay(originalFileName),
    storagePath,
    data: buffer,
    mimeType,
    sizeBytes: buffer.length,
    uploadedByUserId,
  });

  const [created] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!created) throw new Error('Failed to read back the inserted media row.');
  return created;
}

// Deliberately excludes `data` (the file's bytes, potentially up to
// 10MB each) — the media library page lists every row and only ever
// needs metadata, pointing each image at /api/media/[id] rather than
// embedding its bytes, so pulling `data` here would mean loading the
// entire library's worth of file content into memory on every page
// view for no reason.
export async function listMedia() {
  return db
    .select({
      id: media.id,
      fileName: media.fileName,
      storagePath: media.storagePath,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      width: media.width,
      height: media.height,
      altText: media.altText,
      uploadedByUserId: media.uploadedByUserId,
      createdAt: media.createdAt,
    })
    .from(media)
    .orderBy(desc(media.createdAt));
}

export async function getMediaById(id: string): Promise<Media | null> {
  const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteMediaFile(mediaRow: Media): Promise<void> {
  await db.delete(media).where(eq(media.id, mediaRow.id));
}
