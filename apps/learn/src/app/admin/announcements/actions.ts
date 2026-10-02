'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { announcements } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';

type TargetType = 'all' | 'membership' | 'course' | 'group';

export async function createAnnouncement(formData: FormData) {
  const admin = await requireAdminAction('announcements.manage');

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const targetType = String(formData.get('targetType') ?? 'all') as TargetType;
  const sendEmail = formData.get('sendEmail') === 'on';
  if (!title || !body) throw new Error('Title and body are required.');

  const id = crypto.randomUUID();
  await db.insert(announcements).values({
    id,
    title,
    body,
    targetType,
    channels: { dashboard: true, email: sendEmail },
  });

  await logAudit({ actorUserId: admin.id, action: 'announcement.created', targetType: 'announcement', targetId: id, metadata: { title, targetType } });
  revalidatePath('/admin/announcements');
}

export async function updateAnnouncement(id: string, formData: FormData) {
  const admin = await requireAdminAction('announcements.manage');

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const targetType = String(formData.get('targetType') ?? 'all') as TargetType;
  const sendEmail = formData.get('sendEmail') === 'on';
  if (!title || !body) throw new Error('Title and body are required.');

  await db
    .update(announcements)
    .set({ title, body, targetType, channels: { dashboard: true, email: sendEmail } })
    .where(eq(announcements.id, id));

  await logAudit({ actorUserId: admin.id, action: 'announcement.updated', targetType: 'announcement', targetId: id, metadata: { title, targetType } });
  revalidatePath('/admin/announcements');
  redirect('/admin/announcements');
}

export async function deleteAnnouncement(id: string) {
  const admin = await requireAdminAction('announcements.manage');

  await db.delete(announcements).where(eq(announcements.id, id));

  await logAudit({ actorUserId: admin.id, action: 'announcement.deleted', targetType: 'announcement', targetId: id });
  revalidatePath('/admin/announcements');
}
