'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { announcements } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';

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

  await logLearnAudit({ actorUserId: null, action: 'announcement.created', targetType: 'announcement', targetId: id, metadata: { title, targetType, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/announcements');
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

  await logLearnAudit({ actorUserId: null, action: 'announcement.updated', targetType: 'announcement', targetId: id, metadata: { title, targetType, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/announcements');
  redirect('/dashboard/learn/announcements');
}

export async function deleteAnnouncement(id: string) {
  const admin = await requireAdminAction('announcements.manage');

  await db.delete(announcements).where(eq(announcements.id, id));

  await logLearnAudit({ actorUserId: null, action: 'announcement.deleted', targetType: 'announcement', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/announcements');
}
