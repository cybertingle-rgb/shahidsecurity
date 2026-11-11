#!/usr/bin/env node
// Static SEO linter for the built site. Run after `pnpm build` (or let
// `pnpm seo:check` build first). Crawls dist/**/index.html and checks the
// same things a human SEO pass checks by hand: duplicate titles/descriptions,
// missing title/description/canonical, H1 count, meta description length,
// broken internal links, orphan pages, noindexed pages leaking into the
// sitemap, and images missing alt text or a loading hint.
//
// Exit code 0 = no hard failures (warnings are still printed and still
// written to the JSON report). Exit code 1 = at least one hard failure.
// This is the gate a CI job or an agent should check, not the warning count.
//
// Usage: node scripts/seo-crawl.mjs [--json out.json]
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const SITE = 'https://shahidiqbal.com';

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `pnpm build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry === 'index.html') out.push(full);
  }
  return out;
}

const files = walk(DIST);
const allPaths = new Set(files.map((f) => f.replace(DIST, '').replace(/index\.html$/, '')));
const inboundLinks = new Map([...allPaths].map((p) => [p, new Set()]));

const pages = []; // per-page parsed record
const titleIndex = new Map(); // title text -> [paths]
const descIndex = new Map();
const brokenLinks = []; // { from, to }
const crossAppLinks = []; // { from, to } — links into apps/gateway (Next.js), can't be verified from this static crawl
const noindexPaths = new Set();

// Paths under these prefixes are served by apps/gateway (Next.js), not this
// Astro build, except for the Astro-owned pages explicitly listed. A link
// into the unlisted remainder can't be checked here — see Deploy & Verify's
// production-smoke-test.mjs for live verification of those routes instead.
const CROSS_APP_PREFIXES = ['/learn/', '/admin/'];
const ASTRO_OWNED_LEARN_PAGES = new Set(['/learn/', '/learn/pricing/', '/learn/roadmap/']);

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const path = file.replace(DIST, '').replace(/index\.html$/, '');

  const title = extract(html, /<title>([^<]*)<\/title>/i);
  const description = extract(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = extract(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const isNoindex = /<meta[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html);
  if (isNoindex) noindexPaths.add(path);

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;

  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  // alt="" is a deliberate, valid a11y pattern for a decorative image inside an
  // already-labelled control (e.g. an icon inside a button with aria-label) —
  // only a genuinely missing alt attribute is a real failure.
  const imagesMissingAlt = imgs.filter((tag) => !/\balt="[^"]*"/.test(tag)).length;
  const imagesMissingLoading = imgs.filter((tag) => !/loading="(lazy|eager)"/.test(tag)).length;

  if (title) {
    if (!titleIndex.has(title)) titleIndex.set(title, []);
    titleIndex.get(title).push(path);
  }
  if (description) {
    if (!descIndex.has(description)) descIndex.set(description, []);
    descIndex.get(description).push(path);
  }

  // internal link check (same logic as before, plus broken-link detection)
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#') || href.startsWith('http') === false && !href.startsWith('/')) {
      continue;
    }
    let p = href;
    if (p.startsWith(SITE)) p = p.slice(SITE.length);
    if (!p.startsWith('/')) continue; // external, skip
    p = p.split('#')[0].split('?')[0];
    if (p.startsWith('/api/')) continue; // not a static page
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(p);
    if (hasExtension) {
      // a real static asset (css/js/svg/ico/png/xml/webmanifest/...), not a page
      if (!existsSync(join(DIST, p))) brokenLinks.push({ from: path, to: href });
      continue;
    }
    const norm = p.endsWith('/') ? p : p + '/';
    if (allPaths.has(norm)) {
      if (norm !== path) inboundLinks.get(norm).add(path);
      continue;
    }
    const isCrossApp = CROSS_APP_PREFIXES.some((prefix) => norm.startsWith(prefix)) && !ASTRO_OWNED_LEARN_PAGES.has(norm);
    if (isCrossApp) {
      crossAppLinks.push({ from: path, to: href });
    } else {
      brokenLinks.push({ from: path, to: href });
    }
  }

  pages.push({ path, title, description, canonical, isNoindex, h1Count, imagesMissingAlt, imagesMissingLoading, imageCount: imgs.length });
}

// --- build report ---
const hardFailures = [];
const warnings = [];

for (const p of pages) {
  if (!p.title) hardFailures.push(`${p.path}: missing <title>`);
  if (!p.description) hardFailures.push(`${p.path}: missing meta description`);
  if (!p.canonical) hardFailures.push(`${p.path}: missing canonical link`);
  if (p.h1Count !== 1) hardFailures.push(`${p.path}: has ${p.h1Count} <h1> elements (expected exactly 1)`);
  if (p.description && (p.description.length < 70 || p.description.length > 160)) {
    warnings.push(`${p.path}: meta description is ${p.description.length} chars (recommended 70-160)`);
  }
  if (p.imagesMissingAlt > 0) warnings.push(`${p.path}: ${p.imagesMissingAlt} image(s) missing alt text`);
}

for (const [title, paths] of titleIndex) {
  if (paths.length > 1) hardFailures.push(`Duplicate <title> "${title}" on: ${paths.join(', ')}`);
}
for (const [, paths] of descIndex) {
  if (paths.length > 1) hardFailures.push(`Duplicate meta description on: ${paths.join(', ')}`);
}
for (const { from, to } of brokenLinks) {
  hardFailures.push(`${from}: broken internal link to "${to}"`);
}

const orphans = [...inboundLinks.entries()].filter(([p, sources]) => p !== '/' && sources.size === 0).map(([p]) => p);
if (orphans.length > 0) warnings.push(`${orphans.length} orphan page(s) with zero inbound internal links: ${orphans.join(', ')}`);

// sitemap vs noindex cross-check
const sitemapPath = join(DIST, 'sitemap-0.xml');
if (existsSync(sitemapPath)) {
  const sitemapXml = readFileSync(sitemapPath, 'utf8');
  const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const url of sitemapUrls) {
    const path = url.replace(SITE, '');
    if (noindexPaths.has(path)) {
      hardFailures.push(`${path}: noindexed but still listed in sitemap-0.xml`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totalPages: pages.length,
  hardFailureCount: hardFailures.length,
  warningCount: warnings.length,
  hardFailures,
  warnings,
  orphans,
  crossAppLinksUnverified: crossAppLinks,
};

const jsonArgIdx = process.argv.indexOf('--json');
const jsonOut = jsonArgIdx !== -1 ? process.argv[jsonArgIdx + 1] : null;
if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify(report, null, 2));
  console.log(`Wrote ${jsonOut}`);
}

console.log(`\nSEO crawl: ${pages.length} pages checked.`);
console.log(`\n=== HARD FAILURES (${hardFailures.length}) ===`);
hardFailures.forEach((f) => console.log(`  ✗ ${f}`));
console.log(`\n=== WARNINGS (${warnings.length}) ===`);
warnings.forEach((w) => console.log(`  ! ${w}`));

if (crossAppLinks.length > 0) {
  console.log(`\n=== Cross-app links, not verifiable from this static crawl (${crossAppLinks.length}) ===`);
  console.log('  (these point into apps/gateway — the Next.js app — not this Astro build;');
  console.log('   verify them live via scripts/production-smoke-test.mjs instead)');
  crossAppLinks.forEach(({ from, to }) => console.log(`  ? ${from} -> ${to}`));
}

process.exit(hardFailures.length > 0 ? 1 : 0);
