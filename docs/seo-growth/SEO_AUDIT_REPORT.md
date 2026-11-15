# SEO Audit Report — Shahid Security (shahidiqbal.com)

**Date:** 2026-11-15
**Scope:** Phase 1 (re-audit) of the "Complete SEO Audit, Strategy, Optimisation & Growth" project. This supersedes `01_BASELINE_AUDIT.md` (2026-10-28) as the current technical baseline — that report is kept for history, not as the active reference.

## 1. Why this re-audit exists

The October 28 audit was accurate at the time but the site has materially changed since: `apps/admin` and `apps/learn` were merged into a single `apps/gateway` Next.js app (platform consolidation — no more `admin.shahidiqbal.com` / `learn.shahidiqbal.com` subdomains, everything is now under `shahidiqbal.com`), a `/pricing/` page and a `/company-profile/` page were added, and the blog grew from 50 published posts to 86. A technical audit from three weeks ago is not a safe foundation for a new strategy phase without re-verification — this report re-verifies from scratch.

## 2. Repository and build (verified this session)

- `pnpm build` (Astro, `output: 'static'`) → **235 pages built**, 0 build errors. Up from 157/158 pages on Oct 28.
- Content collections: `services` (10), `industries` (7), `caseStudies` (1), `blog` (86 published), `legal` (3) — services/industries/case-studies unchanged in count since Oct 28; blog nearly doubled.
- Two pages exist now that didn't on Oct 28: `/pricing/` and `/company-profile/`, both real, substantive content (not stubs).
- `node scripts/seo-crawl.mjs` (the project's own crawl linter, built in a prior session) run fresh against this build: **0 hard failures, 122 warnings** across 235 pages. See `SEO_TECHNICAL_AUDIT.md` for the full breakdown.
- Still true, re-confirmed: no live network access to `shahidiqbal.com` from this session (proxy-level block, not a site problem), and no Google Search Console / GA4 / Bing Webmaster Tools connector available. Every finding below is a crawl of the local production build, which should match what's deployed but isn't verified against the live site this session.

## 3. URL inventory and classification

Full row-by-row detail in `SEO_URL_INVENTORY.csv` (250 rows: 235 built Astro pages + 15 representative `apps/gateway` administrative/student-portal route groups that the Astro crawl can't see, added manually from source inspection).

| Category | Count | Indexable |
|---|---|---|
| Homepage | 1 | Yes |
| Service pages | 10 (+1 index) | Yes |
| Industry pages | 7 (+1 index) | Yes |
| Blog posts | 86 (+1 index) | Yes |
| Blog tag pages | ~95 | No (`noindex, follow`, correctly excluded from sitemap) |
| Case studies | 1 (+1 index) | Yes |
| Legal pages | 3 | Yes |
| Static pages | 5 (about, book, contact, **pricing** [new], **company-profile** [new]) | Yes |
| Learn-bridge pages (Astro-rendered) | 3 (`/learn/`, `/learn/pricing/`, `/learn/roadmap/`) | Yes |
| Thank-you pages | 2 | No (`noindex`, correctly unlinked — expected, not an error) |
| **Administrative routes** (`apps/gateway/src/app/admin/*`) | all subsections | No — `robots: { index: false, follow: false }` at the root `/admin` layout, plus `robots.txt Disallow: /admin/` (defense in depth, confirmed in source) |
| **Student-portal routes** (`apps/gateway/src/app/learn/*`) | mixed | `dashboard`, `admin` (internal, blocked duplicate), `reset-password`, `verify-email` are noindexed (confirmed) + robots.txt-disallowed; `courses`, `personal-training` are intentionally indexable; **`login`, `register`, `forgot-password` have no robots override and are indexable by default — see §5, a real gap** |

## 4. What's still correct from the October 28 baseline

- Zero duplicate `<title>` tags, zero duplicate meta descriptions, zero missing meta descriptions, zero missing/mismatched canonical URLs, zero pages with 0 or >1 `<h1>`, zero images missing `alt` text, zero broken internal links, zero `noindex` pages leaking into the sitemap — all re-verified fresh against the current 235-page build, not assumed carried over.
- Valid, consistent JSON-LD site-wide, re-verified by parsing every page's structured data: `ProfessionalService` + `WebSite` (235 each), `BreadcrumbList` (232 — correctly absent only on the homepage and the two thank-you pages), `CollectionPage`/`WebPage` (new `pageType` values used by newer page templates), `FAQPage` (105), `BlogPosting` (86), `Service` (10), one each of `ContactPage`, `ProfilePage`/`Person`, and `Article` (the case study — a reasonable type choice, not an error). **Zero** `LocalBusiness`, `Review`, `Rating`, or `AggregateRating` schema anywhere — the anti-fabrication rule is still being honoured in the code, not just in prose.
- `/admin/*` is blocked both by `robots.txt` and by page-level `robots: { index: false, follow: false }` metadata — genuine defense in depth, confirmed by reading the actual layout file, not assumed.

## 5. What changed or newly broke since October 28

- **New, real P1 finding: 99 of 235 pages have a meta description over 160 characters** (several over 240, one at 323), almost entirely blog posts published during the recent high-volume content push. These get truncated in Google's search result snippets, directly hurting click-through rate on exactly the content set the business has invested the most in recently. This did not exist as a finding on Oct 28 because most of this content didn't exist yet. See `SEO_TECHNICAL_AUDIT.md` §1 for the full list and `SEO_PRIORITY_MATRIX.md` for remediation sequencing.
- **22 pages have a meta description under 70 characters** (mostly blog tag pages, which is low-severity since they're noindexed anyway, but also `/terms/` and `/learn/pricing/`, which are indexable and worth tightening).
- **New gap, not previously assessed:** `/learn/login/`, `/learn/register/`, `/learn/forgot-password/` have no `robots` metadata override in their route files and inherit the parent `/learn` layout's indexable-by-default posture — inconsistent with their sibling auth pages (`reset-password`, `verify-email`), which are correctly noindexed. These are utility pages with no unique search value; indexing them is a minor crawl-budget and thin-content inconsistency, not a critical error.
- **T04 from the Oct 28 report (images missing an explicit `loading` attribute) is still open and has not been fixed**, despite a prior task record describing "low-risk loading fixes" as done: a fresh direct measurement against the current build found **1,032 of 1,052 `<img>` tags (98%) still have no explicit `loading` attribute** (20 `loading="lazy"`, 0 `loading="eager"`). Whatever that prior fix touched, it did not reach the bulk of the site. Stated plainly because the measured code is the source of truth here, not the task history.
- **T10 from Oct 28 (no analytics installed) is still open** — a fresh grep for `gtag`, `googletagmanager`, `google-analytics`, and any GA4 measurement ID pattern across `src/` and `apps/gateway/src/` found zero matches. No live Google data source exists to measure any of this work's actual impact yet.
- **Scope expansion, not a defect:** the site's crawlable surface used to be entirely Astro-rendered. It now includes real public pages served by a separate Next.js app (`apps/gateway`) under the same domain — `/learn/courses/*`, `/learn/personal-training/`, `/learn/login/`, `/learn/register/` — with their own `generateMetadata` conventions and their own `sitemap.xml` (referenced correctly in `robots.txt` as `https://shahidiqbal.com/learn/sitemap.xml`). This was out of scope for the Oct 28 project by its own explicit framing ("apps/admin and apps/learn... out of scope... except where the Astro site links out to them") — that framing is now outdated, since they share a domain and crawl budget with the Astro site. This re-audit covers the public/private route boundary of that app (§3 above) but a full page-by-page technical audit of `apps/gateway`'s own public pages (course listing/detail metadata quality, its own structured data, its own internal linking) has not been done and should be a named Phase 6/7 item, not assumed clean by proximity to a clean Astro site.
- **Build-time dependency risk, by design, not a bug:** `/pricing/` and `/learn/pricing/` both fetch live plan data from `shahidiqbal.com/admin`'s API at Astro build time; in this sandbox that fetch correctly fails (no network) and the page degrades gracefully to an empty-plans state after 4 retries, per the code's own documented fallback behaviour. In production this depends on the admin app being reachable at the moment the Astro site's GitHub Actions build runs — worth knowing as a dependency, not a defect to fix.
- Minor: 22 legacy-URL rules now counted in `public/.htaccess` (was 23 on Oct 28 — one fewer, not investigated further since it's a one-line count, not a content change) — still unverified against the live server, same access limitation as before.

## 6. Internationalization baseline (unchanged)

Still English-only: `<html lang="en">` site-wide, zero `hreflang` tags, no Arabic or other-language routes. This remains the honest starting point for Phase 2/8's Arabic SEO work.

## 7. What this phase could not do, and why

Same three gaps as Oct 28, still open: no Google Search Console, GA4, or Bing Webmaster Tools access; no live network access to verify the production site directly against this local-build crawl; no licensed keyword-volume/CPC/difficulty tool. None of these blocked this audit — they limit what can be *measured* (real impressions, clicks, live redirect behaviour), not what can be *inspected* in the source.

## 8. Immediate next step

Phase 2 (keyword research refresh) and Phase 3 (competitor research refresh) are running in parallel with this report. Phase 4 will reconcile all three into a single implementation plan and URL map; Phase 6 picks up the P1 technical fixes identified here (meta-description lengths, the three unindexed-by-default auth pages, image loading attributes) — see `SEO_PRIORITY_MATRIX.md` for exact sequencing.
