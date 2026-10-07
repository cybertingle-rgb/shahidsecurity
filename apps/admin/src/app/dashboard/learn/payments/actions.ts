'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { manualPaymentSubmissions, payments, orders, enrollments } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';
import { grantProductAccess, resolveCourseIdForProduct } from '@/lib/learn/enrollment';

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
 * flips an order to paid and creates the enrollment. verifiedByUserId is
 * left null — it has a real FK to Learn's own users table, and the
 * acting admin here is a row in this app's own adminUsers table instead;
 * their email goes into the audit metadata.
 */
export async function approveManualPayment(submissionId: string) {
  const admin = await requireAdminAction('payments.verify');
  const { submission, payment, order } = await loadSubmissionChain(submissionId);

  if (payment.status === 'succeeded') return;

  await db.update(manualPaymentSubmissions).set({ status: 'approved' }).where(eq(manualPaymentSubmissions.id, submission.id));
  await db.update(payments).set({ status: 'succeeded', verifiedByUserId: null, verifiedAt: new Date() }).where(eq(payments.id, payment.id));
  await db.update(orders).set({ status: 'paid', paidAt: new Date() }).where(eq(orders.id, order.id));

  const courseId = await resolveCourseIdForProduct(order.productId);

  await db.insert(enrollments).values({
    id: crypto.randomUUID(),
    userId: order.userId,
    courseId,
    productId: order.productId,
    source: 'purchase',
    status: 'active',
  });

  await grantProductAccess(order.userId, order.productId);

  await logLearnAudit({
    actorUserId: null,
    action: 'payment.approved',
    targetType: 'payment',
    targetId: payment.id,
    metadata: { orderId: order.id, orderNumber: order.orderNumber, adminActorEmail: admin.email },
  });

  revalidatePath('/dashboard/learn/payments');
  revalidatePath('/dashboard/learn/orders');
}

export async function rejectManualPayment(submissionId: string, formData: FormData) {
  const admin = await requireAdminAction('payments.verify');
  const { submission, payment } = await loadSubmissionChain(submissionId);
  const note = String(formData.get('note') ?? '');

  await db.update(manualPaymentSubmissions).set({ status: 'rejected', adminNotes: note || null }).where(eq(manualPaymentSubmissions.id, submission.id));
  await db.update(payments).set({ status: 'failed' }).where(eq(payments.id, payment.id));

  await logLearnAudit({ actorUserId: null, action: 'payment.rejected', targetType: 'payment', targetId: payment.id, metadata: { note, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payments');
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

  await logLearnAudit({ actorUserId: null, action: 'payment.clarification_requested', targetType: 'payment', targetId: payment.id, metadata: { note, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payments');
}
