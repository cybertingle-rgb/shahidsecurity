'use server';

import { revalidatePath } from 'next/cache';
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
