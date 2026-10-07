'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';
import { setLearnSetting } from '@/lib/learn/settings';

export async function updateSettings(formData: FormData) {
  const admin = await requireAdminAction('settings.manage');

  const supportEmail = String(formData.get('supportEmail') ?? '');
  await setLearnSetting('support_email', supportEmail || null);

  await logLearnAudit({ actorUserId: null, action: 'settings.updated', targetType: 'settings', metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/settings');
}
