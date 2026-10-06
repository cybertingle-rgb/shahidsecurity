'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { invoices, payments } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { nextInvoiceNumber, getInvoiceById, getTotalPaidForInvoice } from '@/lib/payments';

export async function createInvoice(formData: FormData) {
  const admin = await requireAdminAction('payments.manage');

  const customerId = String(formData.get('customerId') ?? '').trim();
  if (!customerId) throw new Error('Customer is required.');
  const amountDue = String(formData.get('amountDue') ?? '').trim();
  if (!amountDue || Number.isNaN(Number(amountDue)) || Number(amountDue) <= 0) throw new Error('A valid amount is required.');
  const currency = String(formData.get('currency') ?? 'USD').trim().toUpperCase().slice(0, 3);
  const dueDateRaw = String(formData.get('dueDate') ?? '');
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  const id = crypto.randomUUID();
  const invoiceNumber = await nextInvoiceNumber();
  await db.insert(invoices).values({
    id,
    customerId,
    invoiceNumber,
    currency,
    amountDue,
    status: 'sent',
    dueDate,
    createdByUserId: admin.id,
  });

  await logAudit({ actorUserId: admin.id, action: 'invoice.created', targetType: 'invoice', targetId: id, metadata: { invoiceNumber, amountDue, currency } });
  redirect(`/dashboard/payments/${id}`);
}

export async function voidInvoice(id: string) {
  const admin = await requireAdminAction('payments.manage');
  await db.update(invoices).set({ status: 'void' }).where(eq(invoices.id, id));
  await logAudit({ actorUserId: admin.id, action: 'invoice.voided', targetType: 'invoice', targetId: id });
  revalidatePath(`/dashboard/payments/${id}`);
  revalidatePath('/dashboard/payments');
}

/**
 * Records a payment against an invoice. `provider` is always 'manual'
 * here — this app has no live payment gateway wired to real credentials
 * (PAYMENT_PROVIDER/PAYMENT_API_KEY/PAYMENT_SECRET are unset by default;
 * see docs/PAYMENTS.md once written). This records a real, already-
 * received payment (e.g. a confirmed bank transfer), it does not process
 * one — there is no card data anywhere in this form.
 */
export async function recordManualPayment(invoiceId: string, formData: FormData) {
  const admin = await requireAdminAction('payments.manage');
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Invoice not found.');

  const amount = String(formData.get('amount') ?? '').trim();
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) throw new Error('A valid amount is required.');
  const reference = String(formData.get('reference') ?? '').trim() || null;

  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    invoiceId,
    customerId: invoice.customerId,
    provider: 'manual',
    providerPaymentRef: reference,
    amount,
    currency: invoice.currency,
    status: 'succeeded',
    recordedByUserId: admin.id,
  });

  const totalPaid = (await getTotalPaidForInvoice(invoiceId)) + Number(amount);
  if (totalPaid >= Number(invoice.amountDue)) {
    await db.update(invoices).set({ status: 'paid' }).where(eq(invoices.id, invoiceId));
  }

  await logAudit({ actorUserId: admin.id, action: 'payment.recorded_manual', targetType: 'payment', targetId: paymentId, metadata: { invoiceId, amount, reference } });
  revalidatePath(`/dashboard/payments/${invoiceId}`);
  revalidatePath('/dashboard/payments');
}
