'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { testimonials, reviewRequests } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getTestimonialById } from '@/lib/testimonials';

/**
 * Every testimonial here must be a real quote from a real client — the
 * admin UI has no "generate" button and no AI assist for this form.
 * `sourceUrl`, when present, is what distinguishes 'verified' from
 * 'unverified' below.
 */
export async function createTestimonial(formData: FormData) {
  const admin = await requireAdminAction('testimonials.manage');

  const authorName = String(formData.get('authorName') ?? '').trim();
  const quote = String(formData.get('quote') ?? '').trim();
  if (!authorName || !quote) throw new Error('Author name and quote are required.');
  const sourceUrl = String(formData.get('sourceUrl') ?? '').trim() || null;
  const customerId = String(formData.get('customerId') ?? '').trim() || null;

  const id = crypto.randomUUID();
  await db.insert(testimonials).values({
    id,
    customerId,
    authorName,
    quote,
    sourceUrl,
    verificationStatus: sourceUrl ? 'verified' : 'pending',
    status: 'draft',
    createdByUserId: admin.id,
  });

  await logAudit({ actorUserId: admin.id, action: 'testimonial.created', targetType: 'testimonial', targetId: id, metadata: { authorName } });
  revalidatePath('/dashboard/testimonials');
}

export async function setTestimonialVerification(id: string, formData: FormData) {
  const admin = await requireAdminAction('testimonials.manage');
  const verificationStatus = String(formData.get('verificationStatus') ?? '') as 'pending' | 'verified' | 'unverified';
  if (!['pending', 'verified', 'unverified'].includes(verificationStatus)) throw new Error('Invalid status.');

  await db.update(testimonials).set({ verificationStatus }).where(eq(testimonials.id, id));
  await logAudit({ actorUserId: admin.id, action: `testimonial.verification_changed.${verificationStatus}`, targetType: 'testimonial', targetId: id });
  revalidatePath('/dashboard/testimonials');
}

export async function publishTestimonial(id: string) {
  const admin = await requireAdminAction('testimonials.manage');
  await db.update(testimonials).set({ status: 'published' }).where(eq(testimonials.id, id));
  await logAudit({ actorUserId: admin.id, action: 'testimonial.published', targetType: 'testimonial', targetId: id });
  revalidatePath('/dashboard/testimonials');
}

export async function unpublishTestimonial(id: string) {
  const admin = await requireAdminAction('testimonials.manage');
  await db.update(testimonials).set({ status: 'draft' }).where(eq(testimonials.id, id));
  await logAudit({ actorUserId: admin.id, action: 'testimonial.unpublished', targetType: 'testimonial', targetId: id });
  revalidatePath('/dashboard/testimonials');
}

export async function deleteTestimonial(id: string) {
  const admin = await requireAdminAction('testimonials.manage');
  const current = await getTestimonialById(id);
  if (!current) return;
  if (current.status !== 'draft') {
    throw new Error('Only a draft (never-published) testimonial can be deleted.');
  }
  await db.delete(testimonials).where(eq(testimonials.id, id));
  await logAudit({ actorUserId: admin.id, action: 'testimonial.deleted', targetType: 'testimonial', targetId: id });
  revalidatePath('/dashboard/testimonials');
}

/**
 * Records that a review request was sent to a real customer. This app
 * doesn't send the email/message itself (no EMAIL_PROVIDER wired yet —
 * see env.ts) — the admin copies the real Google review link shown on
 * the form and sends it themselves. Never generates a fake review or a
 * review URL that isn't the business's real one.
 */
export async function sendReviewRequest(formData: FormData) {
  const admin = await requireAdminAction('testimonials.manage');
  const customerId = String(formData.get('customerId') ?? '').trim();
  if (!customerId) throw new Error('Customer is required.');

  const id = crypto.randomUUID();
  await db.insert(reviewRequests).values({ id, customerId, requestedByUserId: admin.id });

  await logAudit({ actorUserId: admin.id, action: 'review_request.sent', targetType: 'review_request', targetId: id, metadata: { customerId } });
  revalidatePath('/dashboard/testimonials/review-requests');
}

export async function markReviewRequestCompleted(id: string) {
  const admin = await requireAdminAction('testimonials.manage');
  await db.update(reviewRequests).set({ status: 'completed' }).where(eq(reviewRequests.id, id));
  await logAudit({ actorUserId: admin.id, action: 'review_request.marked_completed', targetType: 'review_request', targetId: id });
  revalidatePath('/dashboard/testimonials/review-requests');
}
