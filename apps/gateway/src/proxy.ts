import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Reconciles two conflicting trailing-slash conventions under one domain
// (see next.config.mjs's skipTrailingSlashRedirect comment for why a
// single global `trailingSlash` setting can't do this): the Astro site
// uses trailingSlash: 'always', while apps/admin and apps/learn both use
// Next's own default (no trailing slash). This adds the slash only for
// paths this app itself serves (the Astro site, via the catch-all route
// handler); /admin/* and /learn/* pass through completely untouched, so
// next.config.mjs's rewrites() see exactly the path the browser sent.
const PASSTHROUGH_PREFIXES = ['/admin', '/learn'];
// apps/learn's own internal /admin/* route group (docs/consolidation/
// PLATFORM_AUDIT.md §8) duplicates apps/admin's /dashboard/learn/* —
// confirmed by direct diff to be the same features, not just similarly
// named (same logic, same imports restructured, cosmetic text only).
// Per the decision in docs/consolidation/UNIFIED_ARCHITECTURE.md §4.1,
// apps/admin/dashboard/learn/* is canonical; this makes the duplicate
// genuinely unreachable from the public internet through the one entry
// point this project controls, rather than merely unlinked. apps/learn's
// own code is untouched — reachable again by removing this block, with
// no deploy of that app needed, if that ever turns out to be wrong.
const BLOCKED_PREFIXES = ['/learn/admin'];
// Next's own default redirect logic exempts a path whose last segment
// contains a dot (treated as a filename, e.g. /favicon.ico, /robots.txt,
// /sitemap-index.xml) — matched here for the same reason: those are real
// files in astro-dist/, not directory-style pages, and must never gain a
// trailing slash.
const HAS_FILE_EXTENSION = /\/[^/]+\.[^/]+$/;

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  if (matchesPrefix(pathname, BLOCKED_PREFIXES)) {
    return new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  if (matchesPrefix(pathname, PASSTHROUGH_PREFIXES)) {
    return NextResponse.next();
  }
  if (pathname.endsWith('/') || HAS_FILE_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(`${pathname}/${request.nextUrl.search}`, request.url), 308);
}

export const config = {
  // Matches every path except Next's own internal/static ones — those
  // never need trailing-slash handling and must never be redirected.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
