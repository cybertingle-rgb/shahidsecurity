'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';
import { isTrainingRequestStatus, setTrainingRequestStatus, setTrainingRequestInternalNotes, setTrainingRequestAgreedPrice } from '@/lib/learn/trainingRequests';

export async function updateTrainingRequestStatus(id: string, formData: FormData) {
  const admin = await requireAdminAction('learn.manage');
  const status = String(formData.get('status') ?? '');
  if (!isTrainingRequestStatus(status)) throw new Error('Invalid status.');

  await setTrainingRequestStatus(id, status);
  await logLearnAudit({ actorUserId: null, action: 'training_request.status_changed', targetType: 'training_request', targetId: id, metadata: { status, adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/training-requests/${id}`);
  revalidatePath('/dashboard/learn/training-requests');
}

export async function updateTrainingRequestNotes(id: string, formData: FormData) {
  const admin = await requireAdminAction('learn.manage');
  const internalNotes = String(formData.get('internalNotes') ?? '');

  await setTrainingRequestInternalNotes(id, internalNotes);
  await logLearnAudit({ actorUserId: null, action: 'training_request.notes_updated', targetType: 'training_request', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/training-requests/${id}`);
}

/**
 * Records the agreed price only — never flips the request to 'approved'
 * on its own. The admin still has to make that an explicit, separate
 * status change (updateTrainingRequestStatus above), so a price can be
 * jotted down mid-discussion without the student seeing a half-finished
 * offer appear on their own request page.
 */
export async function updateTrainingRequestPrice(id: string, formData: FormData) {
  const admin = await requireAdminAction('learn.manage');
  const amountMajor = Number(formData.get('agreedPriceAmount') ?? 0);
  const currencyCode = String(formData.get('agreedCurrencyCode') ?? 'USD');

  await setTrainingRequestAgreedPrice(id, Math.round(amountMajor * 100), currencyCode);
  await logLearnAudit({ actorUserId: null, action: 'training_request.price_agreed', targetType: 'training_request', targetId: id, metadata: { amountMajor, currencyCode, adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/training-requests/${id}`);
}
