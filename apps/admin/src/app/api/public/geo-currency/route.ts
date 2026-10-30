import { NextRequest, NextResponse } from 'next/server';
import { detectCountryFromRequest } from '@/lib/pricing/geo';
import { currencyForCountry, COUNTRY_TO_CURRENCY, FALLBACK_CURRENCY } from '@/lib/pricing/currency';
import { checkRateLimit } from '@/lib/auth/rateLimit';

// Public, unauthenticated, cross-origin by design — same reasoning as
// apps/learn's /api/luna/chat (the one real server in the project; the
// Astro marketing site is static with no backend of its own).
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Detects the visitor's country/currency for the public pricing page's
 * automatic local-currency display (docs/PRICING.md §9). Detection
 * order: server-side IP lookup (detectCountryFromRequest) first; if
 * that comes back empty, an optional `?localeRegion=XX` query param —
 * sent by the client from `Intl.NumberFormat().resolvedOptions().locale`'s
 * region subtag — is used as the brief's documented "browser locale as
 * fallback" step, since a server can't read that on its own. USD is the
 * final fallback either way; this endpoint never fails loudly, only
 * ever returns 200 with its best guess (or USD).
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`geo-currency:ip:${ip}`, { maxAttempts: 60, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS_HEADERS });
  }

  const detected = await detectCountryFromRequest(request);
  let countryCode = detected.countryCode;
  let source = detected.source;

  if (!countryCode) {
    const localeRegion = new URL(request.url).searchParams.get('localeRegion');
    if (localeRegion && /^[A-Z]{2}$/i.test(localeRegion) && COUNTRY_TO_CURRENCY[localeRegion.toUpperCase()]) {
      countryCode = localeRegion.toUpperCase();
      source = 'locale';
    }
  }

  const currencyCode = currencyForCountry(countryCode) ?? FALLBACK_CURRENCY;

  return NextResponse.json({ countryCode, currencyCode, source: countryCode ? source : 'fallback_usd' }, { headers: CORS_HEADERS });
}
