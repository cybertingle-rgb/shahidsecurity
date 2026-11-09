import { eq, desc } from 'drizzle-orm';
import { db } from '@/learn-core/db';
import { orders, users, products } from '@/learn-core/db/schema';

export async function listOrders() {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      amount: orders.amount,
      currencyCode: orders.currencyCode,
      status: orders.status,
      createdAt: orders.createdAt,
      studentName: users.fullName,
      studentEmail: users.email,
      productName: products.name,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .orderBy(desc(orders.createdAt))
    .limit(100);
}
