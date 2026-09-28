import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { exchangeRates } from '@/db/schema';

export async function listExchangeRatesAdmin() {
  const rows = await db.select().from(exchangeRates).orderBy(asc(exchangeRates.currencyCode));
  return rows.map((r) => ({ ...r, rate: Number(r.rate) }));
}
