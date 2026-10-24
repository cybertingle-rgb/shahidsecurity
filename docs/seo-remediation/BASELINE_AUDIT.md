# Baseline Audit — Shahid Security SEO Remediation

**Date of audit:** 2026-10-24
**Branch:** `claude/wizardly-keller-yg0bj7`
**Commit at start of this work:** `ec31e2f2637baf254dc904e07ddd082e698bec9d` ("Remove phone number and WhatsApp everywhere — email is now the only contact channel")
**Repository:** `cybertingle-rgb/shahidsecurity` (monorepo)

This document records the state of the repository before the SEO/content work in this phase began, so later reports can be checked against a known starting point.

## 1. Repository shape

This is a pnpm workspace monorepo with three independently deployed applications:

| Property | Path | Framework | Purpose |
|---|---|---|---|
| shahidiqbal.com | repo root (`src/`) | Astro (static output) | Public marketing site, blog, services, legal |
| learn.shahidiqbal.com | `apps/learn` | Next.js (App Router, standalone output) | LMS: public course catalog, student dashboard, legacy in-app admin |
| admin.shahidiqbal.com | `apps/admin` | Next.js (App Router, standalone output) | Dedicated admin panel (business + Learn data) |

All three deploy via GitHub Actions to Hostinger (`.github/workflows/deploy.yml`, `deploy-lms.yml`, `deploy-admin.yml`), with Hostinger's own git-connected build pipeline doing the actual build/publish on each push to the deploy branch. GitHub Actions itself is mostly used for post-deploy HTTP calls (`migrate`, `apply-grants`), not the build.

This report's scope is **shahidiqbal.com (repo root) only** — the SEO/content/phone-privacy work in this phase. The Learn-with-Shahid business-model work requested in the same brief is explicitly **out of scope for this phase** (see note at the end of this document).

## 2. Content architecture (root site)

Astro content collections, defined in `src/content.config.ts`:

- **`blog`** — `src/content/blog/*.mdx`. Schema: `title`, `description`, `publishedAt`, `updatedAt` (optional), `tags[]`, `author` (default "Shahid Iqbal"), `cover` (optional image), `draft` (default false), `relatedService` (optional, matches a `services/*.mdx` filename), `relatedPosts[]` (slugs), `faqs[]` ({q, a}).
- **`services`** — `src/content/services/*.mdx`. 10 services: `ai-automation`, `compliance-risk-assessment`, `custom-software-development`, `cyber-threat-intelligence`, `incident-response`, `monitoring-training`, `network-cloud-security`, `penetration-testing`, `secure-website-development`, `vulnerability-assessment`.
- **`caseStudies`** — `src/content/caseStudies/*.mdx`.
- **`legal`** — `src/content/legal/*.mdx` (privacy policy, terms, responsible disclosure).

**At audit time, 31 published blog posts existed** (see `CONTENT_RESEARCH_SOURCES.md` for the full list and how the 10 new posts in this phase were chosen to avoid duplicating them).

Blog publishing is fully automatic: `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`, and `src/pages/blog/tag/[tag].astro` all read the collection directly via `getCollection('blog', ({ data }) => !data.draft)` — adding a non-draft `.mdx` file is sufficient for it to appear on the index, its own route, tag pages, and (via the sitemap integration crawling built routes) the sitemap. No manual wiring step was required for Phase 7 of the brief ("content discovery and internal linking") beyond adding reciprocal `relatedPosts` links where relevant.

## 3. SEO infrastructure already in place

- `@astrojs/sitemap` integration configured in `astro.config.mjs`, generating `sitemap-index.xml`.
- `public/robots.txt` allows all crawling except `/api/`, `/contact/thanks/`, `/book/thanks/`, and references the sitemap.
- `src/lib/schema.ts` generates JSON-LD (`organizationSchema()`, `breadcrumbSchema()`, and per the blog slug page, article/FAQ schema wired from each post's frontmatter).
- `src/lib/seo.ts` provides shared SEO helpers (canonical URL generation, OG image handling).
- Per-page `BaseLayout` props carry `title`, `description`, `path` (canonical), `ogImage`, `pageType`, `noindex` where applicable.

This infrastructure was built in earlier phases of this project (see `docs/` for prior SEO audit history — this is not a greenfield SEO setup).

## 4. Deployment / build

- Build command: `astro check && astro build` (root `package.json`).
- Package manager: pnpm (workspace).
- Node version: 22.x (per Hostinger deploy logs seen in prior sessions).
- **Baseline build status at commit `ec31e2f`: passing.** `pnpm astro check` → 0 errors, 0 warnings. `pnpm build` → 95 pages built successfully (confirmed in the prior session immediately before this phase began).

## 5. Phone number — status at audit start

The business phone number and all WhatsApp contact methods were **already removed from shahidiqbal.com, learn.shahidiqbal.com, and admin.shahidiqbal.com** in the immediately preceding work (commit `ec31e2f` and the session before it), in response to an explicit prior request. That work:

- Removed `phone`, `phoneDisplay`, `whatsappNumber` from the central `site.ts` config and the `whatsappLink()`/`telLink()` helpers.
- Removed the WhatsApp icon from the social rail on all three properties.
- Removed phone/WhatsApp mentions from the footer, CTA bands, contact page, thank-you pages, the incident-response service page, the privacy policy, and the responsible disclosure page.
- Removed the `telephone` field from the Organization JSON-LD.
- Updated Luna (the AI chat widget)'s system prompt and FAQ answers to stop directing visitors to WhatsApp.
- Added a required email field to the booking form (which previously collected no email at all, by design, relying on phone/WhatsApp confirmation) end-to-end: the Astro form, `book.php`'s validation and mail body, and the admin app's leads-intake schema and database inserts.

This phase's `PHONE_PRIVACY_AUDIT.md` re-verifies that work against the current repository state and the newly-added blog content, and extends the inventory to external (non-repository-controlled) occurrences where research tools allow.

## 6. Known constraints for this phase

- **No live network access to the production sites.** This sandboxed session cannot browse shahidiqbal.com, learn.shahidiqbal.com, or admin.shahidiqbal.com directly — all verification is against the local repository build output, not the live deployed site. Where this report says "removed," it means removed from the source that will be deployed, not independently confirmed on the live URL.
- **No Search Console or analytics access.** Phase 9 of the brief (search performance measurement) could not use real impressions/clicks/ranking data — see `SEO_VALIDATION_REPORT.md` for the manual checklist provided instead.
- **`WebFetch` was unavailable for the duration of this session** (DNS resolution failures on every domain tested, including unrelated domains — a session-level tooling issue, not a site-specific block). All external research in this phase used `WebSearch` only, which returns synthesized, sourced summaries rather than raw page fetches. Every source cited in the new blog posts and in `CONTENT_RESEARCH_SOURCES.md` was found and attributed via `WebSearch`, not independently re-fetched and re-read in full. This is disclosed for honesty, not hidden.
- **No admin-app phone-number fields were touched in this phase** — the admin app's own internal business-settings or user-profile phone fields (if any exist, separate from the public site's removed contact info) were not inspected in this specific pass, since this phase's phone-privacy scope was the public-facing properties, consistent with the earlier work.

## 7. Out of scope for this phase (explicitly deferred)

The same brief that requested this SEO/content work also requested a complete rearchitecture of learn.shahidiqbal.com from a self-paced course platform into a live personal-training/booking business (new data model for training programs/packages/bookings/sessions, instructor and student dashboards, payment verification rules, etc.).

**That work was not started in this phase.** It is a separate, large, payment-and-schema-touching initiative that the brief's own text repeatedly flags as needing owner confirmation on real open questions (for example, what the existing PKR 800 enrollment fee actually represents). Attempting it in the same pass as a content/SEO push — without that confirmation, and without a dedicated migration-safety review — risks breaking a live revenue path for the sake of doing everything at once. It should be scoped and executed as its own phase, with the owner's confirmation on the open questions the brief itself identifies.
