/**
 * Single source of truth for country → currency mapping and amount
 * formatting, used by both the geo-currency detection endpoint and the
 * pricing-plans endpoint (see src/app/api/public/geo-currency/route.ts
 * and .../pricing-plans/route.ts). USD is the canonical base currency
 * everywhere else in this module — see fxRates.ts for how a USD amount
 * becomes an approximate figure in one of these.
 *
 * Deliberately not exhaustive — every country not listed here falls
 * back to USD, per the brief's explicit "USD as final fallback"
 * requirement. Covers the explicitly named target markets plus the
 * rest of the Eurozone and the other major economies a cybersecurity
 * consultancy is realistically going to get inbound interest from.
 * Extend this map (and ensure a matching row exists in the `fx_rates`
 * table after the next refresh — see fxRates.ts) rather than adding a
 * second mapping anywhere else.
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Explicitly named in the brief
  PK: 'PKR',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  OM: 'OMR',
  GB: 'GBP',
  US: 'USD',
  CA: 'CAD',
  AU: 'AUD',
  // Eurozone
  AT: 'EUR', BE: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR', FR: 'EUR', DE: 'EUR',
  GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR', LT: 'EUR', LU: 'EUR', MT: 'EUR',
  NL: 'EUR', PT: 'EUR', SK: 'EUR', SI: 'EUR', ES: 'EUR', HR: 'EUR',
  // Other GCC / Middle East
  KW: 'KWD', BH: 'BHD', JO: 'JOD', EG: 'EGP', IQ: 'IQD', IL: 'ILS', TR: 'TRY', LB: 'LBP',
  // Rest of Europe (non-Euro)
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', RO: 'RON', HU: 'HUF', BG: 'BGN', IS: 'ISK',
  // Asia-Pacific
  IN: 'INR', SG: 'SGD', MY: 'MYR', ID: 'IDR', PH: 'PHP', TH: 'THB', VN: 'VND', BD: 'BDT',
  JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', TW: 'TWD', NZ: 'NZD',
  // Africa
  ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', MA: 'MAD',
  // Americas
  MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP',
};

export const FALLBACK_CURRENCY = 'USD';

// Currencies whose minor unit isn't 2 decimal places — zero-decimal
// currencies (e.g. JPY, KRW) display with no fraction at all, and OMR/
// BHD/KWD/JOD genuinely price in thousandths (3 decimals), not cents.
// Getting this wrong doesn't just look odd — it silently moves the
// decimal point on a displayed price by a factor of 10 or 1000.
const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'VND', 'IDR', 'HUF']);
const THREE_DECIMAL_CURRENCIES = new Set(['OMR', 'BHD', 'KWD', 'JOD']);

export function decimalPlacesFor(currencyCode: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currencyCode)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(currencyCode)) return 3;
  return 2;
}

export function currencyForCountry(countryCode: string | null | undefined): string {
  if (!countryCode) return FALLBACK_CURRENCY;
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? FALLBACK_CURRENCY;
}

/**
 * Locale-aware formatting via Intl — handles the currency symbol, ISO
 * code fallback for currencies Intl doesn't have a symbol for, grouping
 * separators, and the correct decimal-place count (overridden per
 * decimalPlacesFor above, since Intl's own defaults disagree with it
 * for a couple of these currencies in some environments).
 */
export function formatCurrencyAmount(amount: number, currencyCode: string, locale = 'en-US'): string {
  const digits = decimalPlacesFor(currencyCode);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    // Intl throws for a currency code it doesn't recognize at all
    // (rare, but possible for a less common ISO 4217 code depending on
    // the JS engine's ICU data) — fall back to a plain "CODE amount"
    // rendering rather than crashing the page.
    return `${currencyCode} ${amount.toFixed(digits)}`;
  }
}
