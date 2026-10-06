import { db } from '@/db';
import { businessSettings, type BusinessSettings } from '@/db/schema';

/**
 * business_settings is a single-row table by convention (see
 * src/db/schema/business.ts) — this creates that one row the first time
 * anything reads it, so callers never have to special-case "no row yet".
 */
export async function getOrCreateBusinessSettings(): Promise<BusinessSettings> {
  const rows = await db.select().from(businessSettings).limit(1);
  if (rows[0]) return rows[0];

  const id = crypto.randomUUID();
  await db.insert(businessSettings).values({ id });
  const [created] = await db.select().from(businessSettings).limit(1);
  if (!created) throw new Error('Failed to create business_settings row.');
  return created;
}
