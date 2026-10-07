import { eq, desc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { products, prices } = learnSchema;

export async function listProducts() {
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product ?? null;
}

export async function listPricesForProduct(productId: string) {
  return db.select().from(prices).where(eq(prices.productId, productId)).orderBy(desc(prices.isActive));
}
