import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { memberships, communities, communityAccess, products } from '@/db/schema';

/**
 * The side effects a product grant has beyond the `enrollments` row itself
 * — called from both the admin manual-grant action and (Phase 7) the
 * payment-approval flow, so the two paths can't drift apart. Per
 * docs/lms-security.md's community_access state machine: a grant only ever
 * moves a student to `eligible`, never straight to `invited`/`joined` —
 * actually inviting someone is still a deliberate admin action.
 */
export async function grantMembershipIfApplicable(userId: string, productId: string) {
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product || product.type !== 'membership') return;

  const [existing] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.productId, productId)));

  if (existing) {
    await db.update(memberships).set({ status: 'active' }).where(eq(memberships.id, existing.id));
  } else {
    await db.insert(memberships).values({ id: crypto.randomUUID(), userId, productId, status: 'active' });
  }
}

export async function updateCommunityEligibility(userId: string, productId: string) {
  const rows = await db
    .select({ id: communities.id })
    .from(communities)
    .where(and(eq(communities.requiredProductId, productId), eq(communities.status, 'active')));

  for (const c of rows) {
    const [existing] = await db
      .select({ id: communityAccess.id, status: communityAccess.status })
      .from(communityAccess)
      .where(and(eq(communityAccess.userId, userId), eq(communityAccess.communityId, c.id)));

    if (!existing) {
      await db.insert(communityAccess).values({ id: crypto.randomUUID(), userId, communityId: c.id, status: 'eligible' });
    } else if (existing.status === 'not_eligible' || existing.status === 'revoked') {
      await db.update(communityAccess).set({ status: 'eligible' }).where(eq(communityAccess.id, existing.id));
    }
  }
}

/** Call after creating an `enrollments` row for a product — never a substitute for it. */
export async function grantProductAccess(userId: string, productId: string) {
  await grantMembershipIfApplicable(userId, productId);
  await updateCommunityEligibility(userId, productId);
}

/** The reverse of the above, called when an enrollment is revoked. */
export async function revokeProductAccess(userId: string, productId: string) {
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (product?.type === 'membership') {
    await db
      .update(memberships)
      .set({ status: 'cancelled' })
      .where(and(eq(memberships.userId, userId), eq(memberships.productId, productId)));
  }

  const rows = await db.select({ id: communities.id }).from(communities).where(eq(communities.requiredProductId, productId));
  for (const c of rows) {
    // Only pulls back a bare `eligible` grant — an invite already sent
    // (`invited`/`joined`) is left alone, since un-inviting someone from a
    // Discord/Telegram/etc. is a manual admin action, not automatic.
    await db
      .update(communityAccess)
      .set({ status: 'not_eligible' })
      .where(and(eq(communityAccess.userId, userId), eq(communityAccess.communityId, c.id), eq(communityAccess.status, 'eligible')));
  }
}
