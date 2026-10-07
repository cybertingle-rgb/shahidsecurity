import { eq, and } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { memberships, communities, communityAccess, products } = learnSchema;

/**
 * Ported from apps/learn/src/lib/enrollment.ts, unchanged except for the
 * db/schema import — the side effects a product grant/revoke has beyond
 * the `enrollments` row itself, now run against Learn's database from
 * this app's manual-grant/revoke actions (src/app/dashboard/learn/students).
 */
export async function resolveCourseIdForProduct(productId: string): Promise<string | null> {
  const [product] = await db.select({ courseId: products.courseId }).from(products).where(eq(products.id, productId));
  return product?.courseId ?? null;
}

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

export async function grantProductAccess(userId: string, productId: string) {
  await grantMembershipIfApplicable(userId, productId);
  await updateCommunityEligibility(userId, productId);
}

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
    await db
      .update(communityAccess)
      .set({ status: 'not_eligible' })
      .where(and(eq(communityAccess.userId, userId), eq(communityAccess.communityId, c.id), eq(communityAccess.status, 'eligible')));
  }
}
