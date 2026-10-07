import { eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { exchangeRates } = learnSchema;

/**
 * Geo-IP currency localization — display-only. The transactional ledger
 * (orders/payments) stays in USD, unchanged; this layer only ever decides
 * what number to *show* a given visitor. Every function here degrades to
 * "just show USD" on any failure rather than throwing, so this file can
 * never break checkout.
 *
 * Exchange rates are admin-entered (see /admin/exchange-rates), not fetched
 * from a live FX API — deliberately: the admin sets today's rate once and
 * it holds exactly there, unchanged, until they update it again. No
 * external FX dependency, no silent drift between page loads.
 */

// Deliberately not exhaustive — every country not listed falls back to
// USD, which is always a safe, correct thing to show. Extend as needed;
// this never needs a code deploy for a *price*, only for adding a new
// country's currency mapping.
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  PK: 'PKR',
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  IN: 'INR',
  BD: 'BDT',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  PT: 'EUR',
  TR: 'TRY',
  SG: 'SGD',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  NG: 'NGN',
  ZA: 'ZAR',
  EG: 'EGP',
  CN: 'CNY',
  JP: 'JPY',
  KR: 'KRW',
};

export const BASE_CURRENCY = 'USD';

/**
 * Best-effort — reads the first hop off x-forwarded-for (the visitor's
 * real IP, not anything the browser itself reports — Chrome's own
 * location setting/permission is unrelated and never consulted); never
 * the source of truth for anything security-sensitive.
 */
function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return headers.get('x-real-ip');
}

const countryCache = new Map<string, { country: string | null; expiresAt: number }>();
const COUNTRY_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Geo-IP lookup via a free, keyless API — best-effort with a short
 * timeout and an in-memory per-IP cache (this is soft localization, not
 * billing-critical, so a stale-for-an-hour answer is fine). Returns null
 * on any failure, timeout, private/local IP, or unlisted country —
 * callers treat null as "show USD."
 */
export async function detectCountryFromHeaders(headers: Headers): Promise<string | null> {
  const ip = extractClientIp(headers);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return null;

  const cached = countryCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.country;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://ipapi.co/${ip}/country/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`geo-ip lookup failed: ${res.status}`);
    const country = (await res.text()).trim().toUpperCase();
    const result = /^[A-Z]{2}$/.test(country) ? country : null;
    countryCache.set(ip, { country: result, expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS });
    return result;
  } catch {
    countryCache.set(ip, { country: null, expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS });
    return null;
  }
}

export function currencyForCountry(countryCode: string | null): string {
  if (!countryCode) return BASE_CURRENCY;
  return COUNTRY_TO_CURRENCY[countryCode] ?? BASE_CURRENCY;
}

type RateTable = Record<string, number>; // currencyCode -> units per 1 USD

let ratesMemoryCache: { rates: RateTable; fetchedAt: number } | null = null;
const RATES_CACHE_TTL_MS = 5 * 60 * 1000; // just enough to avoid a DB hit on every page load

/**
 * Reads admin-entered rates from the exchange_rates table — never a live
 * external fetch. A short in-memory cache means an admin's rate update
 * takes up to 5 minutes to show everywhere, not instantly; that's a
 * deliberate trade for not hitting the DB on every single request.
 */
export async function getUsdExchangeRates(): Promise<RateTable> {
  if (ratesMemoryCache && Date.now() - ratesMemoryCache.fetchedAt < RATES_CACHE_TTL_MS) {
    return ratesMemoryCache.rates;
  }

  const rows = await db.select().from(exchangeRates);
  const rates: RateTable = {};
  for (const row of rows) rates[row.currencyCode] = Number(row.rate);

  ratesMemoryCache = { rates, fetchedAt: Date.now() };
  return rates;
}

/** Called by the admin exchange-rates actions after a write, so a rate change shows up immediately rather than waiting out the cache. */
export function invalidateExchangeRateCache(): void {
  ratesMemoryCache = null;
}

export function convertFromUsd(amountUsdMinorUnits: number, targetCurrency: string, rates: RateTable): { amount: number; currencyCode: string } {
  if (targetCurrency === BASE_CURRENCY) return { amount: amountUsdMinorUnits, currencyCode: BASE_CURRENCY };
  const rate = rates[targetCurrency];
  if (!rate) return { amount: amountUsdMinorUnits, currencyCode: BASE_CURRENCY }; // no admin-set rate — show USD rather than a wrong number
  return { amount: Math.round(amountUsdMinorUnits * rate), currencyCode: targetCurrency };
}

/** The one call most pages need: headers in, a display-ready converted amount out. */
export async function localizeAmountForRequest(amountUsdMinorUnits: number, headers: Headers): Promise<{ amount: number; currencyCode: string }> {
  const country = await detectCountryFromHeaders(headers);
  const currency = currencyForCountry(country);
  const rates = await getUsdExchangeRates();
  return convertFromUsd(amountUsdMinorUnits, currency, rates);
}

export async function getExchangeRateRow(currencyCode: string): Promise<{ rate: number; updatedAt: Date } | null> {
  const [row] = await db.select().from(exchangeRates).where(eq(exchangeRates.currencyCode, currencyCode));
  return row ? { rate: Number(row.rate), updatedAt: row.updatedAt } : null;
}
