'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { consultationSettings, socReadinessSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getOrCreateConsultationSettings, getOrCreateSocReadinessSettings } from '@/lib/pricing/plans';

export async function updateConsultationSettings(formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const current = await getOrCreateConsultationSettings();

  const feeUsdRaw = String(formData.get('feeUsd') ?? '').trim();
  if (!feeUsdRaw || Number.isNaN(Number(feeUsdRaw)) || Number(feeUsdRaw) < 0) {
    throw new Error('Consultation fee must be a valid non-negative number.');
  }
  const durationMinutes = Number(formData.get('durationMinutes') ?? 45) || 45;
  const isRefundable = formData.get('isRefundable') === 'on';
  const refundPolicyText = String(formData.get('refundPolicyText') ?? '').trim() || null;

  await db
    .update(consultationSettings)
    .set({ feeUsd: feeUsdRaw, durationMinutes, isRefundable, refundPolicyText, updatedByUserId: admin.id })
    .where(eq(consultationSettings.id, current.id));

  await logAudit({
    actorUserId: admin.id,
    action: 'consultation_settings.updated',
    targetType: 'consultation_settings',
    targetId: current.id,
    metadata: { feeUsd: feeUsdRaw, durationMinutes, isRefundable },
  });
  revalidatePath('/dashboard/pricing');
}

export async function updateSocReadiness(formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const current = await getOrCreateSocReadinessSettings();

  const availability = String(formData.get('availability') ?? 'disabled') as 'disabled' | 'inquiry_only' | 'active';
  if (!['disabled', 'inquiry_only', 'active'].includes(availability)) {
    throw new Error('Invalid availability value.');
  }
  const notes = String(formData.get('notes') ?? '').trim() || null;

  await db.update(socReadinessSettings).set({ availability, notes, updatedByUserId: admin.id }).where(eq(socReadinessSettings.id, current.id));

  await logAudit({
    actorUserId: admin.id,
    action: 'soc_readiness.changed',
    targetType: 'soc_readiness_settings',
    targetId: current.id,
    metadata: { availability, previous: current.availability },
  });
  revalidatePath('/dashboard/pricing');
}
