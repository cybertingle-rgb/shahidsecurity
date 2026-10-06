#!/usr/bin/env node
/**
 * Read-only smoke test against the live production site — no writes,
 * no state changes, safe to run anytime. Checks HTTP status, canonical
 * tag, title, meta description, JSON-LD presence, robots meta, and (for
 * the homepage) that the sitemap and robots.txt themselves are
 * reachable. Exits non-zero on any failure so it can gate a deploy.
 *
 * This could not be run from the admin build session itself — its
 * sandboxed network policy blocks outbound requests to the production
 * domain (confirmed via the agent proxy's recentRelayFailures, a
 * connect_rejected/403 for shahidiqbal.com). Run this from an
 * environment with real network access, e.g. locally or in CI:
 *
 *   node scripts/production-smoke-test.mjs
 *   node scripts/production-smoke-test.mjs https://staging.example.com
 */

const BASE_URL = process.argv[2] ?? 'https://shahidiqbal.com';

const PAGES = ['/', '/blog/', '/services/', '/about/', '/contact/'];

let failures = 0;

function fail(label, message) {
  failures += 1;
  console.error(`FAIL  ${label}: ${message}`);
}

function pass(label) {
  console.log(`OK    ${label}`);
}

async function checkPage(path) {
  const url = new URL(path, BASE_URL).toString();
  let res;
  try {
    res = await fetch(url, { redirect: 'manual' });
  } catch (err) {
    fail(path, `request failed — ${err instanceof Error ? err.message : err}`);
    return;
  }

  if (res.status !== 200) {
    fail(path, `expected HTTP 200, got ${res.status}`);
    return;
  }
  pass(`${path} → HTTP 200`);

  const html = await res.text();

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (!canonicalMatch) fail(path, 'no <link rel="canonical"> found');
  else pass(`${path} → canonical tag present`);

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) fail(path, 'no non-empty <title> found');
  else pass(`${path} → title: "${titleMatch[1].trim()}"`);

  const descriptionMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (!descriptionMatch || !descriptionMatch[1].trim()) fail(path, 'no non-empty meta description found');
  else pass(`${path} → description present (${descriptionMatch[1].length} chars)`);

  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi);
  if (!jsonLdMatches || jsonLdMatches.length === 0) fail(path, 'no JSON-LD structured data found');
  else pass(`${path} → ${jsonLdMatches.length} JSON-LD block(s) found`);

  const robotsMetaMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i);
  if (robotsMetaMatch && /noindex/i.test(robotsMetaMatch[1])) {
    fail(path, `page is noindex (${robotsMetaMatch[1]}) — confirm this is intentional`);
  }
}

async function checkRobotsAndSitemap() {
  for (const path of ['/robots.txt', '/sitemap-index.xml']) {
    const url = new URL(path, BASE_URL).toString();
    try {
      const res = await fetch(url);
      if (res.status !== 200) fail(path, `expected HTTP 200, got ${res.status}`);
      else pass(`${path} → HTTP 200`);
    } catch (err) {
      fail(path, `request failed — ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function main() {
  console.log(`Smoke-testing ${BASE_URL} (read-only, no writes)...\n`);
  for (const path of PAGES) {
    await checkPage(path);
  }
  await checkRobotsAndSitemap();

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
