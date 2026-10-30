import type { NextRequest } from 'next/server';

export type CountryDetection = {
  countryCode: string | null;
  source: 'header' | 'ip_api' | 'locale' | 'fallback_usd';
};

/**
 * IP-based country lookup, in priority order per the brief's "1.
 * Reliable IP-based country detection... 2. Browser locale as fallback
 * ... 3. USD as final fallback" — this covers step 1 only; step 2
 * (locale) is applied by the caller (geo-currency/route.ts) using a
 * region the CLIENT supplies from Intl, since a server can't read a
 * browser's locale setting. Never requests anything more precise than
 * a country (no GPS, no city-level lookup) — the brief explicitly rules
 * that out.
 *
 * 1. A CDN/edge proxy's own geo header, if one is ever in front of this
 *    app (zero extra cost/latency when present). Hostinger's own
 *    Apache/Passenger layer (confirmed elsewhere in this codebase) does
 *    NOT set one of these today, so this is forward-looking, not a
 *    currently-active path — documented rather than silently assumed.
 * 2. ipwho.is — free, keyless, HTTPS. Same sandbox caveat as
 *    fxRates.ts's provider: this exact response shape is from that
 *    provider's publicly documented, long-stable contract, not a live
 *    test from here (this sandbox has no outbound access to verify
 *    it directly) — the guard below fails safe either way.
 */
export async function detectCountryFromRequest(request: NextRequest): Promise<CountryDetection> {
  const headerCountry =
    request.headers.get('cf-ipcountry') ?? request.headers.get('x-vercel-ip-country') ?? request.headers.get('x-appengine-country');
  if (headerCountry && /^[A-Z]{2}$/i.test(headerCountry)) {
    return { countryCode: headerCountry.toUpperCase(), source: 'header' };
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim();
  // A private/loopback address (local dev, or a misconfigured proxy
  // hop) can never resolve to a real country — skip straight to the
  // caller's locale/USD fallback instead of wasting a request on it.
  if (!ip || isPrivateOrLoopback(ip)) {
    return { countryCode: null, source: 'fallback_usd' };
  }

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) return { countryCode: null, source: 'fallback_usd' };
    const data = (await res.json()) as { success?: boolean; country_code?: string };
    if (data.success && data.country_code && /^[A-Z]{2}$/i.test(data.country_code)) {
      return { countryCode: data.country_code.toUpperCase(), source: 'ip_api' };
    }
    return { countryCode: null, source: 'fallback_usd' };
  } catch {
    // Timeout, network error, or an unparseable response — never let a
    // flaky third-party lookup fail the request; the caller falls back.
    return { countryCode: null, source: 'fallback_usd' };
  }
}

function isPrivateOrLoopback(ip: string): boolean {
  return ip === '::1' || ip === 'unknown' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
}
