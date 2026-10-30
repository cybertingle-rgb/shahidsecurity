import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { fxRates } from '@/db/schema';
import { COUNTRY_TO_CURRENCY, FALLBACK_CURRENCY } from './currency';

/**
 * Provider: open.er-api.com — free, keyless, updates roughly daily
 * (https://www.exchangerate-api.com/docs/free). Chosen specifically
 * because it needs no API key: every other reliable option either
 * requires a paid plan or a signup-gated key that can't be provisioned
 * without the business owner's involvement, and the brief asks this to
 * work without inventing a credential nobody has. If this ever needs
 * to move to a paid provider for better reliability/SLA, only this
 * file's fetchLatestRates() needs to change — every caller only ever
 * sees getUsdRate()/convertFromUsd() below.
 *
 * IMPORTANT, stated plainly rather than silently assumed: this sandbox
 * has no outbound access to verify open.er-api.com's exact response
 * shape directly (only an HTTPS allowlist a handful of domains wide) —
 * the shape below is from that provider's long-stable, publicly
 * documented API contract, not from a live test run here. The runtime
 * guards below (checking `result === 'success'` and that `rates` is a
 * real object with the currencies this app needs) mean a shape
 * mismatch or outage fails safe — falls back to the last cached rate,
 * then to USD — rather than crashing or silently storing garbage, but
 * confirming this against the real endpoint from production (where
 * outbound HTTPS actually works, unlike this sandbox) is a genuine
 * verification step still owed once this ships. See docs/PRICING.md.
 */
const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';

// Refresh cadence: this provider itself only updates once/day, so
// polling more often than that buys nothing. /api/internal/refresh-fx-rates
// is meant to be called by an external cron (Hostinger hPanel → Cron
// Jobs, same mechanism already used for apps/admin's
// publish-scheduled route) — recommend scheduling it every 6 hours,
// documented in docs/PRICING.md, not hardcoded here.
export const FX_RATES_STALE_AFTER_MS = 36 * 60 * 60 * 1000; // 36h — one missed daily provider update is still "fresh enough"

type ProviderResponse = {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
};

/**
 * Fetches live rates and upserts every currency this app actually
 * needs (COUNTRY_TO_CURRENCY's distinct values, plus USD itself) into
 * fx_rates. Called only from the secret-gated internal route — never
 * from a public/request-serving code path, so a slow or failing
 * provider never adds latency to a visitor's page load.
 */
export async function refreshFxRates(): Promise<{ updated: string[]; skipped: string[] }> {
  const res = await fetch(PROVIDER_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`FX provider returned HTTP ${res.status}`);

  const data = (await res.json()) as ProviderResponse;
  if (data.result !== 'success' || !data.rates || typeof data.rates !== 'object') {
    throw new Error('FX provider response did not match the expected shape (missing result:"success" or rates object).');
  }

  const wantedCurrencies = new Set([FALLBACK_CURRENCY, ...Object.values(COUNTRY_TO_CURRENCY)]);
  const updated: string[] = [];
  const skipped: string[] = [];
  const now = new Date();

  for (const code of wantedCurrencies) {
    if (code === 'USD') {
      // USD-to-USD is always exactly 1 — never fetched, never stale.
      await upsertRate('USD', 1, now);
      updated.push('USD');
      continue;
    }
    const rate = data.rates[code];
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      skipped.push(code);
      continue;
    }
    await upsertRate(code, rate, now);
    updated.push(code);
  }

  return { updated, skipped };
}

async function upsertRate(currencyCode: string, rateToUsd: number, fetchedAt: Date): Promise<void> {
  const existing = await db.select().from(fxRates).where(eq(fxRates.currencyCode, currencyCode)).limit(1);
  if (existing[0]) {
    await db.update(fxRates).set({ rateToUsd: rateToUsd.toString(), fetchedAt }).where(eq(fxRates.currencyCode, currencyCode));
  } else {
    await db.insert(fxRates).values({ currencyCode, rateToUsd: rateToUsd.toString(), fetchedAt });
  }
}

export type CachedRate = { currencyCode: string; rateToUsd: number; fetchedAt: Date; isStale: boolean };

/**
 * Reads whatever rate is currently cached (never calls the provider
 * live — see refreshFxRates for that) and reports whether it's stale,
 * so callers can decide how to treat it (the public API still serves a
 * stale rate rather than nothing, but flags it so the UI can say "rates
 * may be a little out of date" instead of silently pretending they're
 * current).
 */
export async function getCachedRate(currencyCode: string): Promise<CachedRate | null> {
  if (currencyCode === 'USD') {
    return { currencyCode: 'USD', rateToUsd: 1, fetchedAt: new Date(), isStale: false };
  }
  const [row] = await db.select().from(fxRates).where(eq(fxRates.currencyCode, currencyCode)).limit(1);
  if (!row) return null;
  const rateToUsd = Number(row.rateToUsd);
  const isStale = Date.now() - row.fetchedAt.getTime() > FX_RATES_STALE_AFTER_MS;
  return { currencyCode, rateToUsd, fetchedAt: row.fetchedAt, isStale };
}

export type ConversionResult = {
  currencyCode: string;
  amount: number;
  rateToUsd: number | null;
  rateTimestamp: Date | null;
  isStale: boolean;
  /** true when the requested currency has no usable cached rate at all and this silently fell back to USD. */
  usedFallback: boolean;
};

/**
 * Converts a USD amount into the requested currency using whatever's
 * cached — never calls the provider inline (would add live-request
 * latency and a new failure mode to every page view). Falls back to
 * USD, per the brief's explicit "gracefully fall back to USD if
 * conversion fails" requirement, when there's no rate cached yet
 * (e.g. before the very first refresh has ever run).
 */
export async function convertFromUsd(usdAmount: number, targetCurrencyCode: string): Promise<ConversionResult> {
  if (targetCurrencyCode === 'USD') {
    return { currencyCode: 'USD', amount: usdAmount, rateToUsd: 1, rateTimestamp: new Date(), isStale: false, usedFallback: false };
  }

  const cached = await getCachedRate(targetCurrencyCode);
  if (!cached) {
    return { currencyCode: 'USD', amount: usdAmount, rateToUsd: null, rateTimestamp: null, isStale: false, usedFallback: true };
  }

  return {
    currencyCode: targetCurrencyCode,
    amount: usdAmount * cached.rateToUsd,
    rateToUsd: cached.rateToUsd,
    rateTimestamp: cached.fetchedAt,
    isStale: cached.isStale,
    usedFallback: false,
  };
}
