'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { manualPaymentMethods } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';

type PaymentMethodType = 'bank_transfer' | 'crypto' | 'mobile_wallet' | 'other';

export async function createManualPaymentMethod(formData: FormData) {
  const admin = await requireAdminAction('payments.manage');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'other') as PaymentMethodType;

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(manualPaymentMethods);

  const id = crypto.randomUUID();
  await db.insert(manualPaymentMethods).values({
    id,
    name,
    type,
    instructions: String(formData.get('instructions') ?? '') || null,
    walletAddress: String(formData.get('walletAddress') ?? '') || null,
    sortOrder: Number(count),
  });

  await logAudit({
    actorUserId: admin.id,
    action: 'manual_payment_method.created',
    targetType: 'manual_payment_method',
    targetId: id,
    metadata: { name, type },
  });
  revalidatePath('/dashboard/payments/methods');
}

export async function updateManualPaymentMethod(id: string, formData: FormData) {
  const admin = await requireAdminAction('payments.manage');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'other') as PaymentMethodType;

  await db
    .update(manualPaymentMethods)
    .set({
      name,
      type,
      instructions: String(formData.get('instructions') ?? '') || null,
      walletAddress: String(formData.get('walletAddress') ?? '') || null,
    })
    .where(eq(manualPaymentMethods.id, id));

  await logAudit({ actorUserId: admin.id, action: 'manual_payment_method.updated', targetType: 'manual_payment_method', targetId: id });
  revalidatePath('/dashboard/payments/methods');
}

export async function setManualPaymentMethodStatus(id: string, nextActive: boolean) {
  const admin = await requireAdminAction('payments.manage');
  await db.update(manualPaymentMethods).set({ isActive: nextActive }).where(eq(manualPaymentMethods.id, id));
  await logAudit({
    actorUserId: admin.id,
    action: `manual_payment_method.${nextActive ? 'activated' : 'deactivated'}`,
    targetType: 'manual_payment_method',
    targetId: id,
  });
  revalidatePath('/dashboard/payments/methods');
}

export async function deleteManualPaymentMethod(id: string) {
  const admin = await requireAdminAction('payments.manage');
  await db.delete(manualPaymentMethods).where(eq(manualPaymentMethods.id, id));
  await logAudit({ actorUserId: admin.id, action: 'manual_payment_method.deleted', targetType: 'manual_payment_method', targetId: id });
  revalidatePath('/dashboard/payments/methods');
}
