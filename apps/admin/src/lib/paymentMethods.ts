import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { manualPaymentMethods } from '@/db/schema';

export async function listPaymentMethods() {
  return db.select().from(manualPaymentMethods).orderBy(asc(manualPaymentMethods.sortOrder));
}

export async function listActivePaymentMethods() {
  return db
    .select()
    .from(manualPaymentMethods)
    .where(eq(manualPaymentMethods.isActive, true))
    .orderBy(asc(manualPaymentMethods.sortOrder));
}

export async function getPaymentMethod(id: string) {
  const rows = await db.select().from(manualPaymentMethods).where(eq(manualPaymentMethods.id, id)).limit(1);
  return rows[0] ?? null;
}
