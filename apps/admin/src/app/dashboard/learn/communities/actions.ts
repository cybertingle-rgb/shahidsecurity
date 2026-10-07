'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { communities, communityAccess } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';

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

  await logLearnAudit({ actorUserId: null, action: 'community.created', targetType: 'community', targetId: id, metadata: { name, platform, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/communities');
}

export async function updateCommunity(id: string, formData: FormData) {
  const admin = await requireAdminAction('communities.manage');

  const name = String(formData.get('name') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const requiredProductId = (formData.get('requiredProductId') as string) || null;
  if (!name || !url) throw new Error('Name and invite URL are required.');

  await db.update(communities).set({ name, url, requiredProductId }).where(eq(communities.id, id));
  await logLearnAudit({ actorUserId: null, action: 'community.updated', targetType: 'community', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/communities');
}

export async function toggleCommunityStatus(id: string, nextStatus: 'active' | 'inactive') {
  const admin = await requireAdminAction('communities.manage');
  await db.update(communities).set({ status: nextStatus }).where(eq(communities.id, id));
  await logLearnAudit({ actorUserId: null, action: `community.status_changed.${nextStatus}`, targetType: 'community', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/communities');
}

export async function markInvited(communityAccessId: string, communityId: string) {
  const admin = await requireAdminAction('communities.manage');
  await db.update(communityAccess).set({ status: 'invited', invitedAt: new Date() }).where(eq(communityAccess.id, communityAccessId));
  await logLearnAudit({ actorUserId: null, action: 'community_access.invited', targetType: 'community_access', targetId: communityAccessId, metadata: { adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/communities/${communityId}`);
}

export async function markJoined(communityAccessId: string, communityId: string) {
  const admin = await requireAdminAction('communities.manage');
  await db.update(communityAccess).set({ status: 'joined', joinedAt: new Date() }).where(eq(communityAccess.id, communityAccessId));
  await logLearnAudit({ actorUserId: null, action: 'community_access.joined', targetType: 'community_access', targetId: communityAccessId, metadata: { adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/communities/${communityId}`);
}
