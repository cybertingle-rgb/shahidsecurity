import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { communities, products } from '@/db/schema';

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
