'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { setSetting } from '@/lib/settings';

export async function updateSettings(formData: FormData) {
  const admin = await requireAdminAction('settings.manage');

  const supportEmail = String(formData.get('supportEmail') ?? '');
  await setSetting('support_email', supportEmail || null);

  await logAudit({ actorUserId: admin.id, action: 'settings.updated', targetType: 'settings' });
  revalidatePath('/admin/settings');
}
