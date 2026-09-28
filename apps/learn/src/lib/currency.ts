import { getSetting, setSetting } from './settings';

/**
 * Geo/FX-based currency localization — display-only. The transactional
 * ledger (orders/payments) stays in USD, unchanged; this layer only ever
 * decides what number to *show* a given visitor. That split means this
 * whole file can fail (network down, API rate-limited, whatever) without
 * breaking checkout — every function here degrades to "just show USD"
 * rather than throwing.
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

/** Best-effort — reads the first hop off x-forwarded-for; never the source of truth for anything security-sensitive. */
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
const RATES_TTL_MS = 6 * 60 * 60 * 1000;
const RATES_SETTING_KEY = 'fx_rates_usd_cache';

/**
 * Live USD exchange rates from a free, keyless API, cached in-memory for
 * this process and persisted to the settings table so a fresh server
 * start still has a recent-ish table before its first successful fetch
 * completes. Falls back to {} (meaning "only USD renders correctly") if
 * every layer fails — never throws.
 */
export async function getUsdExchangeRates(): Promise<RateTable> {
  if (ratesMemoryCache && Date.now() - ratesMemoryCache.fetchedAt < RATES_TTL_MS) {
    return ratesMemoryCache.rates;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`FX rate fetch failed: ${res.status}`);
    const data = (await res.json()) as { result?: string; rates?: RateTable };
    if (data.result !== 'success' || !data.rates) throw new Error('FX rate response malformed');

    ratesMemoryCache = { rates: data.rates, fetchedAt: Date.now() };
    await setSetting(RATES_SETTING_KEY, { rates: data.rates, fetchedAt: Date.now() });
    return data.rates;
  } catch {
    const cached = await getSetting<{ rates: RateTable; fetchedAt: number }>(RATES_SETTING_KEY);
    if (cached?.rates) {
      ratesMemoryCache = { rates: cached.rates, fetchedAt: cached.fetchedAt };
      return cached.rates;
    }
    return {};
  }
}

export function convertFromUsd(amountUsdMinorUnits: number, targetCurrency: string, rates: RateTable): { amount: number; currencyCode: string } {
  if (targetCurrency === BASE_CURRENCY) return { amount: amountUsdMinorUnits, currencyCode: BASE_CURRENCY };
  const rate = rates[targetCurrency];
  if (!rate) return { amount: amountUsdMinorUnits, currencyCode: BASE_CURRENCY }; // no rate available — show USD rather than a wrong number
  return { amount: Math.round(amountUsdMinorUnits * rate), currencyCode: targetCurrency };
}

/** The one call most pages need: headers in, a display-ready converted amount out. */
export async function localizeAmountForRequest(amountUsdMinorUnits: number, headers: Headers): Promise<{ amount: number; currencyCode: string }> {
  const country = await detectCountryFromHeaders(headers);
  const currency = currencyForCountry(country);
  const rates = await getUsdExchangeRates();
  return convertFromUsd(amountUsdMinorUnits, currency, rates);
}
