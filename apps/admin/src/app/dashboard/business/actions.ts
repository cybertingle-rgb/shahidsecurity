'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { businessSettings } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getOrCreateBusinessSettings } from '@/lib/business';

/**
 * Single source of truth for business-identity facts. This form never
 * accepts a review count, rating, customer count, or any other
 * statistic — those fields don't exist on business_settings at all
 * (see src/db/schema/business.ts), so there's nothing here to fabricate.
 */
export async function updateBusinessSettings(formData: FormData) {
  const admin = await requireAdminAction('business.manage');
  const current = await getOrCreateBusinessSettings();

  const openingHours: Record<string, string> = {};
  for (const day of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
    const value = String(formData.get(`hours_${day}`) ?? '').trim();
    if (value) openingHours[day] = value;
  }

  await db
    .update(businessSettings)
    .set({
      legalName: String(formData.get('legalName') ?? '').trim() || null,
      displayName: String(formData.get('displayName') ?? '').trim() || null,
      description: String(formData.get('description') ?? '').trim() || null,
      email: String(formData.get('email') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      addressLine1: String(formData.get('addressLine1') ?? '').trim() || null,
      addressLine2: String(formData.get('addressLine2') ?? '').trim() || null,
      city: String(formData.get('city') ?? '').trim() || null,
      region: String(formData.get('region') ?? '').trim() || null,
      postalCode: String(formData.get('postalCode') ?? '').trim() || null,
      countryCode: String(formData.get('countryCode') ?? '').trim().toUpperCase().slice(0, 2) || null,
      openingHours: Object.keys(openingHours).length > 0 ? openingHours : null,
      googleReviewUrl: String(formData.get('googleReviewUrl') ?? '').trim() || null,
      updatedByUserId: admin.id,
      updatedAt: new Date(),
    })
    .where(eq(businessSettings.id, current.id));

  await logAudit({ actorUserId: admin.id, action: 'business_settings.updated', targetType: 'business_settings', targetId: current.id });
  revalidatePath('/dashboard/business');
}
