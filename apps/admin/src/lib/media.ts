import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { media, type Media } from '@/db/schema';

/**
 * Stored on local disk under a directory outside .next and outside any
 * path Next.js's standalone output traces/bundles — the standalone build
 * only copies files it can see imported at build time (see
 * next.config.mjs's outputFileTracingIncludes comment for the same
 * reasoning applied to the drizzle folder), so runtime uploads need a
 * path the build never touches. `data/media-uploads` resolved from the
 * process's actual cwd at runtime, not from this module's location.
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
 * Validates and saves an uploaded file to disk, then records it in
 * `media`. Never trusts the browser-supplied filename for the actual
 * stored path (that's always `<uuid><allowlisted-extension>`) or the
 * browser-supplied MIME type's extension — only this module's own
 * allowlist decides the extension, closing the classic "upload
 * shell.php.jpg" style bypass.
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

  await mkdir(UPLOAD_DIR, { recursive: true });

  const id = crypto.randomUUID();
  const storedFileName = `${id}${extension}`;
  const storagePath = path.join(UPLOAD_DIR, storedFileName);
  await writeFile(storagePath, buffer);

  await db.insert(media).values({
    id,
    fileName: sanitizeFileNameForDisplay(originalFileName),
    storagePath,
    mimeType,
    sizeBytes: buffer.length,
    uploadedByUserId,
  });

  const [created] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!created) throw new Error('Failed to read back the inserted media row.');
  return created;
}

export async function listMedia(): Promise<Media[]> {
  return db.select().from(media).orderBy(desc(media.createdAt));
}

export async function getMediaById(id: string): Promise<Media | null> {
  const rows = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteMediaFile(mediaRow: Media): Promise<void> {
  await db.delete(media).where(eq(media.id, mediaRow.id));
  await unlink(mediaRow.storagePath).catch(() => {
    // Already gone, or never written — deleting the database row is
    // still correct either way.
  });
}
