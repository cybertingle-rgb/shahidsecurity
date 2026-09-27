'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { communities } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';

type Platform = 'discord' | 'facebook' | 'telegram' | 'whatsapp' | 'other';

export async function createCommunity(formData: FormData) {
  const admin = await requireAdminAction('communities.manage');

  const name = String(formData.get('name') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const platform = String(formData.get('platform') ?? 'other') as Platform;
  const requiredProductId = (formData.get('requiredProductId') as string) || null;
  if (!name || !url) throw new Error('Name and invite URL are required.');

  const id = crypto.randomUUID();
  await db.insert(communities).values({ id, name, url, platform, requiredProductId, status: 'active' });

  // Logs that the link *changed*, never the link itself — an audit trail
  // entry is not a place to duplicate a private invite URL.
  await logAudit({ actorUserId: admin.id, action: 'community.created', targetType: 'community', targetId: id, metadata: { name, platform } });
  revalidatePath('/admin/communities');
}

export async function updateCommunity(id: string, formData: FormData) {
  const admin = await requireAdminAction('communities.manage');

  const name = String(formData.get('name') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const requiredProductId = (formData.get('requiredProductId') as string) || null;
  if (!name || !url) throw new Error('Name and invite URL are required.');

  await db.update(communities).set({ name, url, requiredProductId }).where(eq(communities.id, id));
  await logAudit({ actorUserId: admin.id, action: 'community.updated', targetType: 'community', targetId: id });
  revalidatePath('/admin/communities');
}

export async function toggleCommunityStatus(id: string, nextStatus: 'active' | 'inactive') {
  const admin = await requireAdminAction('communities.manage');
  await db.update(communities).set({ status: nextStatus }).where(eq(communities.id, id));
  await logAudit({ actorUserId: admin.id, action: `community.status_changed.${nextStatus}`, targetType: 'community', targetId: id });
  revalidatePath('/admin/communities');
}
