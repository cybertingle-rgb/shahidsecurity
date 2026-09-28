'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { manualPaymentSubmissions, payments, orders, enrollments } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { grantProductAccess } from '@/lib/enrollment';

async function loadSubmissionChain(submissionId: string) {
  const [submission] = await db.select().from(manualPaymentSubmissions).where(eq(manualPaymentSubmissions.id, submissionId));
  if (!submission) throw new Error('Submission not found.');
  const [payment] = await db.select().from(payments).where(eq(payments.id, submission.paymentId));
  if (!payment) throw new Error('Payment not found.');
  const [order] = await db.select().from(orders).where(eq(orders.id, payment.orderId));
  if (!order) throw new Error('Order not found.');
  return { submission, payment, order };
}

/**
 * "A screenshot alone never grants access; a human admin decision does" —
 * docs/lms-payments.md. This is that decision: the only code path that
 * flips an order to paid and creates the enrollment.
 */
export async function approveManualPayment(submissionId: string) {
  const admin = await requireAdminAction('payments.verify');
  const { submission, payment, order } = await loadSubmissionChain(submissionId);

  await db.update(manualPaymentSubmissions).set({ status: 'approved' }).where(eq(manualPaymentSubmissions.id, submission.id));
  await db.update(payments).set({ status: 'succeeded', verifiedByUserId: admin.id, verifiedAt: new Date() }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: 'paid', paidAt: new Date() }).where(eq(orders.id, order.id));

  await db.insert(enrollments).values({
    id: crypto.randomUUID(),
    userId: order.userId,
    productId: order.productId,
    source: 'purchase',
    status: 'active',
  });

  // Same grant side effects as the admin manual-enroll action — a
  // membership-type product needs its own `memberships` row, and any
  // community gated on this product needs its eligibility flipped. One
  // shared path (src/lib/enrollment.ts) so the two can't drift apart.
  await grantProductAccess(order.userId, order.productId);

  await logAudit({
    actorUserId: admin.id,
    action: 'payment.approved',
    targetType: 'payment',
    targetId: payment.id,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');
}

export async function rejectManualPayment(submissionId: string, formData: FormData) {
  const admin = await requireAdminAction('payments.verify');
  const { submission, payment } = await loadSubmissionChain(submissionId);
  const note = String(formData.get('note') ?? '');

  await db.update(manualPaymentSubmissions).set({ status: 'rejected', adminNotes: note || null }).where(eq(manualPaymentSubmissions.id, submission.id));
  await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));

  await logAudit({ actorUserId: admin.id, action: 'payment.rejected', targetType: 'payment', targetId: payment.id, metadata: { note } });
  revalidatePath('/admin/payments');
}

export async function requestClarification(submissionId: string, formData: FormData) {
  const admin = await requireAdminAction('payments.verify');
  const { submission, payment } = await loadSubmissionChain(submissionId);
  const note = String(formData.get('note') ?? '');
  if (!note.trim()) throw new Error('A note is required when requesting clarification.');

  await db
    .update(manualPaymentSubmissions)
    .set({ status: 'clarification_requested', adminNotes: note })
    .where(eq(manualPaymentSubmissions.id, submission.id));

  await logAudit({ actorUserId: admin.id, action: 'payment.clarification_requested', targetType: 'payment', targetId: payment.id, metadata: { note } });
  revalidatePath('/admin/payments');
}
