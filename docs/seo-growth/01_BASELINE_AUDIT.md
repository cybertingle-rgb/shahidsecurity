# Baseline Audit — Shahid Security (shahidiqbal.com)

**Date:** 2026-10-28
**Scope:** Phase 1 (Discover) of the GCC Cybersecurity SEO Growth Project. Read-only — no production files were changed to produce this report.

## 1. Repository and architecture (verified, not assumed)

- **Framework:** Astro (static output, `output: 'static'`), deployed as a static site. Confirmed via `astro.config.mjs` and `pnpm build` output.
- **Styling:** Tailwind CSS v4 via the Vite plugin (`@tailwindcss/vite`), plus hand-written CSS for bespoke effects (glass cards, neon glows, cursor trail).
- **Content:** 5 Astro content collections defined in `src/content.config.ts` — `services` (10 entries), `industries` (7 entries, added this session), `caseStudies` (1 entry), `blog` (51 entries, 50 published + 1 seeded draft placeholder), `legal` (3 entries).
- **Integrations:** `@astrojs/sitemap`, `@astrojs/mdx`, `astro-icon`.
- **Build/validation scripts available:** `astro check` (typecheck + diagnostics), `pnpm build` (`astro check && astro build`), `pnpm lint` (ESLint across the whole monorepo), `pnpm format` (Prettier), `scripts/verify-redirects.mjs` (requires a live base URL — see Access Requirements), `scripts/generate-og-images.mjs` and `scripts/generate-logo-variants.mjs` (run automatically via `prebuild`).
- **Deployment:** Hostinger's own Git-connected build pipeline auto-builds and serves this repo directly on push to `claude/wizardly-keller-yg0bj7` (confirmed via a comment left in `.github/workflows/deploy-lms.yml` from prior debugging in this project — that workflow only runs post-deploy database migrations for the separate Next.js apps, it does not build or deploy the Astro site itself).
- **Related properties, kept architecturally separate per this project's scope:** `learn.shahidiqbal.com` (Next.js LMS/training platform) and `admin.shahidiqbal.com` (Next.js internal admin panel) — both out of scope for this SEO project except where the Astro site links out to them (homepage, `/learn/` bridge pages).

**Validation scripts run this session:**
- `pnpm astro check` → 0 errors, 0 warnings, 1 pre-existing unrelated hint (`eslint.config.js` deprecation warning).
- `pnpm build` → 158 build-log entries (157 actual HTML pages + sitemap/RSS), 0 errors.
- `pnpm lint` → **fails**, but only on 7 pre-existing errors inside `apps/learn` (missing ESLint plugin definitions for `react-hooks/exhaustive-deps` and `@next/next/no-img-element`) — unrelated to the Astro site or this SEO project; see `03_TECHNICAL_ISSUES.csv` row T08.
- `scripts/verify-redirects.mjs` → requires a live base URL; could not run, see `04_ACCESS_REQUIREMENTS.md`.

## 2. Public site inventory (157 pages, see `02_URL_INVENTORY.csv` for the full row-by-row list)

| Page type | Count |
|---|---|
| Homepage | 1 |
| Service pages | 10 (+1 index) |
| Industry pages | 7 (+1 index) — **new this session**, see §6 |
| Blog posts (published) | 51 (incl. blog index, miscounted as a post in the raw CSV — cosmetic artifact of the crawl script, not a real page) |
| Blog tag pages | 73 (all `noindex, follow`) |
| Case studies | 1 (+1 index) |
| Legal pages | 3 (privacy, terms, responsible disclosure) |
| Static pages | 3 (about, book, contact) |
| Learn-bridge pages | 3 (`/learn/`, `/learn/pricing/`, `/learn/roadmap/` — Astro-rendered pages that link out to the separate learn.shahidiqbal.com app) |
| Deliberately noindexed thank-you pages | 2 (`/contact/thanks/`, `/book/thanks/`) |

## 3. Technical SEO — what the site already does well (confirmed via full crawl)

A full programmatic crawl of every built page (not a sample) found:
- **Zero duplicate `<title>` tags** and **zero duplicate meta descriptions** site-wide.
- **Zero missing meta descriptions.**
- **Zero missing or mismatched canonical URLs** — every canonical tag correctly points at that page's own URL.
- **Zero pages with 0 or >1 `<h1>`** — correct heading structure throughout.
- **Zero images missing an `alt` attribute.**
- **Zero unintended orphan pages** — the only two pages with zero inbound internal links are the thank-you pages, which are *supposed* to be unlinked (post-submission confirmation pages, correctly excluded from the sitemap and marked noindex).
- **Valid, consistent JSON-LD** across the site: `ProfessionalService` + `WebSite` schema on every page (organization-level, from `BaseLayout`), `BreadcrumbList` on every page except the homepage and the two thank-you pages (correct — homepage doesn't need breadcrumbs), `FAQPage` on 68 pages, `BlogPosting` on exactly the 50 published posts, `Service` on exactly the 10 service pages, plus single correct instances of `ProfilePage`/`Person` (About page) and `ContactPage` (Contact page). No fake ratings, review counts, or LocalBusiness claims found anywhere.
- **`robots.txt`** is minimal and correct: allows all crawling except `/api/`, `/contact/thanks/`, `/book/thanks/`, references the sitemap.
- **`noindex` usage is deliberate and correctly scoped** — all 73 blog tag pages use `noindex, follow` (the right pattern: excluded from the index as thin/duplicate-prone pages, while still passing link equity through).

This is a genuinely strong technical foundation. Most of the growth opportunity here is in content/market strategy (Phase 2/3), not technical remediation.

## 4. Confirmed issues and gaps (see `03_TECHNICAL_ISSUES.csv` for full detail, evidence, and priority)

- **T04 (P2):** 682 of 702 `<img>` tags site-wide have no explicit `loading` attribute — a real, fixable Core Web Vitals opportunity.
- **T05 (P3):** The XML sitemap includes all 73 noindex tag pages — minor crawl-budget inefficiency, not a critical error.
- **T06 (P2):** Only 1 published case study — a genuine trust-signal gap, but one that requires real client permission to fill, not content generation (see master brief's anti-fabrication rules).
- **T03 (P1):** 23 legacy-URL redirect rules in `public/.htaccess` are unverified against the live server (no live access this session).

## 5. Internationalization baseline (fact, not a judgment)

Confirmed: the site is English-only. `<html lang="en">` site-wide, **zero `hreflang` tags**, **no Arabic or other-language routes exist**. This is the honest starting point for Phase 2/3's Arabic and GCC-market research — any recommendation to build a dedicated Arabic experience must be justified by real evidence gathered in Phase 2, not assumed necessary from the brief alone.

## 6. What changed since the last SEO work on this site (context, not new work)

Prior sessions (documented in `docs/seo-remediation/` and `docs/blog-seo/`) added 20 new blog posts across two batches, removed all phone-number/WhatsApp references site-wide, and — most recently, in the session immediately before this one — added 7 dedicated industry landing pages (`/industries/saas-technology/`, `/ecommerce/`, `/finance/`, `/healthcare/`, `/education/`, `/manufacturing/`, `/smes/`) replacing a single inline-card overview page. This baseline audit re-verifies the site's *current* state from scratch rather than assuming those prior reports are still accurate, per this project's explicit instruction.

## 7. What Phase 1 could not do, and why

Per `04_ACCESS_REQUIREMENTS.md`: no Google Search Console, GA4, Bing Webmaster Tools, or live-site network access was available in this session. Every "crawl" finding above is a crawl of the local production build (`dist/`), which should match what's deployed but was not verified live. This is disclosed throughout rather than presented as a live-site check.

## 8. Immediate next step

Phase 2 (real keyword/competitor research across Saudi Arabia, Qatar, UAE, Oman, Bahrain, Kuwait, and a lighter pass on UK/US/Canada/Australia) is running in parallel with this report's completion — see `05_GCC_KEYWORD_RESEARCH.csv`, `06_COMPETITOR_ANALYSIS.md`, and `07_KEYWORD_CLUSTER_MAP.md`.
