import { eq, desc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { communities, products, communityAccess, users } = learnSchema;

export async function listCommunities() {
  return db
    .select({
      id: communities.id,
      name: communities.name,
      platform: communities.platform,
      url: communities.url,
      status: communities.status,
      sortOrder: communities.sortOrder,
      requiredProductName: products.name,
    })
    .from(communities)
    .leftJoin(products, eq(communities.requiredProductId, products.id))
    .orderBy(communities.sortOrder);
}

export async function listAllProducts() {
  return db.select({ id: products.id, name: products.name }).from(products);
}

export async function getCommunity(id: string) {
  const [row] = await db.select().from(communities).where(eq(communities.id, id));
  return row ?? null;
}

export async function listCommunityMembers(communityId: string) {
  return db
    .select({
      id: communityAccess.id,
      userId: communityAccess.userId,
      studentName: users.fullName,
      studentEmail: users.email,
      status: communityAccess.status,
      invitedAt: communityAccess.invitedAt,
      joinedAt: communityAccess.joinedAt,
    })
    .from(communityAccess)
    .innerJoin(users, eq(communityAccess.userId, users.id))
    .where(eq(communityAccess.communityId, communityId))
    .orderBy(desc(communityAccess.invitedAt))
    .limit(100);
}
