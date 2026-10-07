'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { paymentMethods } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';

type PaymentMethodType = 'bank_transfer' | 'crypto' | 'mobile_wallet' | 'other';

export async function createPaymentMethod(formData: FormData) {
  const admin = await requireAdminAction('settings.manage');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'other') as PaymentMethodType;

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(paymentMethods);

  const id = crypto.randomUUID();
  await db.insert(paymentMethods).values({
    id,
    name,
    type,
    instructions: String(formData.get('instructions') ?? '') || null,
    walletAddress: String(formData.get('walletAddress') ?? '') || null,
    sortOrder: Number(count),
  });

  await logLearnAudit({ actorUserId: null, action: 'payment_method.created', targetType: 'payment_method', targetId: id, metadata: { name, type, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payment-methods');
}

export async function updatePaymentMethod(id: string, formData: FormData) {
  const admin = await requireAdminAction('settings.manage');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'other') as PaymentMethodType;

  await db
    .update(paymentMethods)
    .set({
      name,
      type,
      instructions: String(formData.get('instructions') ?? '') || null,
      walletAddress: String(formData.get('walletAddress') ?? '') || null,
    })
    .where(eq(paymentMethods.id, id));

  await logLearnAudit({ actorUserId: null, action: 'payment_method.updated', targetType: 'payment_method', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payment-methods');
}

export async function togglePaymentMethodStatus(id: string, nextActive: boolean) {
  const admin = await requireAdminAction('settings.manage');
  await db.update(paymentMethods).set({ isActive: nextActive }).where(eq(paymentMethods.id, id));
  await logLearnAudit({ actorUserId: null, action: `payment_method.${nextActive ? 'activated' : 'deactivated'}`, targetType: 'payment_method', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payment-methods');
}

export async function deletePaymentMethod(id: string) {
  const admin = await requireAdminAction('settings.manage');
  await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  await logLearnAudit({ actorUserId: null, action: 'payment_method.deleted', targetType: 'payment_method', targetId: id, metadata: { adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/payment-methods');
}
