import { asc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { exchangeRates } = learnSchema;

export async function listExchangeRatesAdmin() {
  const rows = await db.select().from(exchangeRates).orderBy(asc(exchangeRates.currencyCode));
  return rows.map((r) => ({ ...r, rate: Number(r.rate) }));
}
