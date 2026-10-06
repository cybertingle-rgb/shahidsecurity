'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { saveUploadedFile, getMediaById, deleteMediaFile, InvalidUploadError } from '@/lib/media';

export async function uploadMedia(formData: FormData) {
  const admin = await requireAdminAction('media.manage');

  const file = formData.get('file');
  if (!(file instanceof File)) throw new Error('No file provided.');

  const buffer = Buffer.from(await file.arrayBuffer());
  let created;
  try {
    created = await saveUploadedFile(buffer, file.name, file.type, admin.id);
  } catch (err) {
    if (err instanceof InvalidUploadError) throw err;
    throw new Error('Upload failed.');
  }

  await logAudit({ actorUserId: admin.id, action: 'media.uploaded', targetType: 'media', targetId: created.id, metadata: { fileName: created.fileName, mimeType: created.mimeType, sizeBytes: created.sizeBytes } });
  revalidatePath('/dashboard/media');
}

export async function deleteMedia(id: string) {
  const admin = await requireAdminAction('media.manage');
  const row = await getMediaById(id);
  if (!row) return;

  await deleteMediaFile(row);
  await logAudit({ actorUserId: admin.id, action: 'media.deleted', targetType: 'media', targetId: id, metadata: { fileName: row.fileName } });
  revalidatePath('/dashboard/media');
}
