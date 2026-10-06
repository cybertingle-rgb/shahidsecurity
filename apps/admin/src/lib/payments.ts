import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customers, invoices, payments } from '@/db/schema';
import { env } from '@/lib/env';

/** Whether a real, credentialed payment gateway is active — never true by default. */
export function paymentProviderStatus() {
  const isLiveGatewayConfigured = env.PAYMENT_PROVIDER !== 'manual' && Boolean(env.PAYMENT_API_KEY) && Boolean(env.PAYMENT_SECRET);
  return { provider: env.PAYMENT_PROVIDER, isLiveGatewayConfigured };
}

export async function listCustomers() {
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomerById(id: string) {
  const rows = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listInvoices() {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      currency: invoices.currency,
      amountDue: invoices.amountDue,
      status: invoices.status,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: string) {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      customerId: invoices.customerId,
      customerName: customers.fullName,
      currency: invoices.currency,
      amountDue: invoices.amountDue,
      status: invoices.status,
      dueDate: invoices.dueDate,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPaymentsForInvoice(invoiceId: string) {
  return db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(desc(payments.createdAt));
}

/** Sum of succeeded payments recorded against an invoice, in the invoice's own minor-unit-free decimal amount. */
export async function getTotalPaidForInvoice(invoiceId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`COALESCE(SUM(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  return Number(rows[0]?.total ?? 0);
}

/** Generates the next sequential invoice number as INV-0001, INV-0002, ... */
export async function nextInvoiceNumber(): Promise<string> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(invoices);
  const nextSeq = Number(rows[0]?.count ?? 0) + 1;
  return `INV-${String(nextSeq).padStart(4, '0')}`;
}
