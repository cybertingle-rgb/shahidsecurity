import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pricingPlans, addOnServices, consultationSettings, socReadinessSettings } from '@/db/schema';

export async function listActivePlans() {
  return db.select().from(pricingPlans).where(eq(pricingPlans.status, 'active')).orderBy(asc(pricingPlans.sortOrder));
}

export async function listAllPlans() {
  return db.select().from(pricingPlans).orderBy(asc(pricingPlans.sortOrder));
}

export async function getPlanBySlug(slug: string) {
  const [row] = await db.select().from(pricingPlans).where(eq(pricingPlans.slug, slug)).limit(1);
  return row ?? null;
}

export async function listActiveAddOns() {
  return db.select().from(addOnServices).where(eq(addOnServices.status, 'active')).orderBy(asc(addOnServices.sortOrder));
}

export async function listAllAddOns() {
  return db.select().from(addOnServices).orderBy(asc(addOnServices.sortOrder));
}

/** Single-row settings table — same lazily-created pattern as getOrCreateBusinessSettings (src/lib/business.ts). */
export async function getOrCreateConsultationSettings() {
  const rows = await db.select().from(consultationSettings).limit(1);
  if (rows[0]) return rows[0];

  const id = crypto.randomUUID();
  await db.insert(consultationSettings).values({ id });
  const [created] = await db.select().from(consultationSettings).limit(1);
  if (!created) throw new Error('Failed to create consultation_settings row.');
  return created;
}

/**
 * Single-row settings table, defaults to 'disabled' per the schema's
 * column default — see src/db/schema/pricing.ts's comment. Never
 * auto-escalated by this function; only an admin action
 * (src/app/dashboard/pricing/actions.ts) ever changes `availability`.
 */
export async function getOrCreateSocReadinessSettings() {
  const rows = await db.select().from(socReadinessSettings).limit(1);
  if (rows[0]) return rows[0];

  const id = crypto.randomUUID();
  await db.insert(socReadinessSettings).values({ id });
  const [created] = await db.select().from(socReadinessSettings).limit(1);
  if (!created) throw new Error('Failed to create soc_readiness_settings row.');
  return created;
}
