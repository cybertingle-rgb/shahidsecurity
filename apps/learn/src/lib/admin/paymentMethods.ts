import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { paymentMethods } from '@/db/schema';

export async function listPaymentMethods() {
  return db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder));
}

export async function listActivePaymentMethods() {
  return db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(asc(paymentMethods.sortOrder));
}

export async function getPaymentMethod(id: string) {
  const [row] = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
  return row ?? null;
}
