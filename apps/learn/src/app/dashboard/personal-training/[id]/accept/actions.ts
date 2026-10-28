'use server';

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { acceptTrainingRequestOffer } from '@/lib/personalTraining';

export async function acceptPersonalTrainingOffer(requestId: string, formData: FormData) {
  const session = await getSessionUser();
  if (!session) throw new Error('Not signed in.');

  const paymentMethodId = String(formData.get('paymentMethodId') ?? '');
  if (!paymentMethodId) throw new Error('Select a payment method.');

  const transactionReference = String(formData.get('transactionReference') ?? '');
  const amountClaimed = Math.round(Number(formData.get('amountClaimed') ?? 0) * 100);
  const paymentDateRaw = String(formData.get('paymentDate') ?? '');
  const receiptFileUrl = String(formData.get('receiptFileUrl') ?? '') || null;

  const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : new Date();

  const result = await acceptTrainingRequestOffer(session.id, requestId, paymentMethodId, {
    transactionReference,
    amountClaimed,
    paymentDate,
    receiptFileUrl,
  });

  if (!result.ok) throw new Error(result.error);

  redirect('/dashboard/orders?submitted=1');
}
