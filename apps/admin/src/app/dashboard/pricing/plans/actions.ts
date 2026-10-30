'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { pricingPlans } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';

type PlanCategory = 'assurance' | 'managed_security';
type PlanStatus = 'draft' | 'active' | 'disabled';

function parsePlanFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Slug is required.');

  const monthlyPriceUsdRaw = String(formData.get('monthlyPriceUsd') ?? '').trim();
  const monthlyPriceUsd = monthlyPriceUsdRaw ? monthlyPriceUsdRaw : null;
  if (monthlyPriceUsd !== null && (Number.isNaN(Number(monthlyPriceUsd)) || Number(monthlyPriceUsd) < 0)) {
    throw new Error('Monthly price must be a valid non-negative number, or left blank for a fully custom-quoted plan.');
  }

  const includedFeatures = String(formData.get('includedFeatures') ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const includedAssetLimitRaw = String(formData.get('includedAssetLimit') ?? '').trim();
  const includedAnalystHoursRaw = String(formData.get('includedAnalystHoursPerMonth') ?? '').trim();
  const minContractMonthsRaw = String(formData.get('minContractMonths') ?? '3').trim();

  return {
    slug,
    name,
    targetAudience: String(formData.get('targetAudience') ?? '').trim() || null,
    category: (String(formData.get('category') ?? 'assurance') as PlanCategory),
    monthlyPriceUsd,
    isStartingAtPrice: formData.get('isStartingAtPrice') === 'on',
    minContractMonths: Number(minContractMonthsRaw) || 3,
    includedFeatures,
    includedAssetLimit: includedAssetLimitRaw ? Number(includedAssetLimitRaw) : null,
    includedAnalystHoursPerMonth: includedAnalystHoursRaw ? Number(includedAnalystHoursRaw) : null,
    isRecommended: formData.get('isRecommended') === 'on',
    ctaLabel: String(formData.get('ctaLabel') ?? '').trim() || null,
    requiresEnterpriseContact: formData.get('requiresEnterpriseContact') === 'on',
    requires24x7Readiness: formData.get('requires24x7Readiness') === 'on',
  };
}

export async function createPricingPlan(formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const fields = parsePlanFields(formData);

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(pricingPlans);

  const id = crypto.randomUUID();
  await db.insert(pricingPlans).values({ id, ...fields, status: 'draft', sortOrder: Number(count) });

  await logAudit({ actorUserId: admin.id, action: 'pricing_plan.created', targetType: 'pricing_plan', targetId: id, metadata: { slug: fields.slug, name: fields.name } });
  revalidatePath('/dashboard/pricing/plans');
  revalidatePath('/dashboard/pricing');
}

export async function updatePricingPlan(id: string, formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const fields = parsePlanFields(formData);

  await db.update(pricingPlans).set(fields).where(eq(pricingPlans.id, id));

  await logAudit({ actorUserId: admin.id, action: 'pricing_plan.updated', targetType: 'pricing_plan', targetId: id, metadata: { slug: fields.slug } });
  revalidatePath('/dashboard/pricing/plans');
  revalidatePath('/dashboard/pricing');
}

export async function setPricingPlanStatus(id: string, status: PlanStatus) {
  const admin = await requireAdminAction('pricing.manage');
  await db.update(pricingPlans).set({ status }).where(eq(pricingPlans.id, id));
  await logAudit({ actorUserId: admin.id, action: 'pricing_plan.status_changed', targetType: 'pricing_plan', targetId: id, metadata: { status } });
  revalidatePath('/dashboard/pricing/plans');
  revalidatePath('/dashboard/pricing');
}

export async function deletePricingPlan(id: string) {
  const admin = await requireAdminAction('pricing.manage');
  await db.delete(pricingPlans).where(eq(pricingPlans.id, id));
  await logAudit({ actorUserId: admin.id, action: 'pricing_plan.deleted', targetType: 'pricing_plan', targetId: id });
  revalidatePath('/dashboard/pricing/plans');
  revalidatePath('/dashboard/pricing');
}
