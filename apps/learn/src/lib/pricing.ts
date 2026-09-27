import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { prices } from '@/db/schema';

export type ResolvedPrice = { amount: number; currencyCode: string; priceId: string };

/**
 * The single place a price is ever looked up for checkout — always the
 * server-side `prices` table, per docs/lms-database.md's price_resolution
 * rule and docs/lms-security.md's "never trust the frontend for payment
 * status" principle. Deliberately takes no client-supplied amount
 * parameter at all: there is nothing for a manipulated request body to
 * override, by construction.
 *
 * Resolution order: exact (product, currency, country) match → currency
 * default (country IS NULL) → null if nothing matches (caller decides the
 * fallback, e.g. the product's base currency).
 */
export async function resolvePrice(productId: string, currencyCode: string, countryCode: string | null): Promise<ResolvedPrice | null> {
  if (countryCode) {
    const [exact] = await db
      .select()
      .from(prices)
      .where(and(eq(prices.productId, productId), eq(prices.currencyCode, currencyCode), eq(prices.countryCode, countryCode), eq(prices.isActive, true)));
    if (exact) return { amount: exact.saleAmount ?? exact.amount, currencyCode: exact.currencyCode, priceId: exact.id };
  }

  const [currencyDefault] = await db
    .select()
    .from(prices)
    .where(and(eq(prices.productId, productId), eq(prices.currencyCode, currencyCode), isNull(prices.countryCode), eq(prices.isActive, true)));
  if (currencyDefault) {
    return { amount: currencyDefault.saleAmount ?? currencyDefault.amount, currencyCode: currencyDefault.currencyCode, priceId: currencyDefault.id };
  }

  return null;
}
