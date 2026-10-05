# SEO Technical Checklist

Status of every technical SEO requirement in the governing brief, verified against the real codebase and (where noted) a real crawl/live check during this audit — not assumed from memory.

| # | Item | shahidiqbal.com | learn.shahidiqbal.com | Verified by |
|---|---|---|---|---|
| 1 | Sitemap exists, dynamic, no private/duplicate URLs | ✅ `@astrojs/sitemap`, auto-built | ✅ `sitemap.ts`, real published-course query | Crawled `dist/`; curled live `/sitemap.xml` |
| 2 | Robots.txt protects private areas without blocking public content | ✅ | ✅ (fixed this audit — was blanket-blocking everything) | Curled live `/robots.txt`; checked `X-Robots-Tag` header on `/` vs `/admin` |
| 3 | Consistent trailing-slash / canonical strategy | ✅ `trailingSlash: always` + Apache 301 | ✅ `alternates.canonical` per page | Code read + build check |
| 4 | Unique title + meta description per page | ✅ 61/61 pages, zero duplicates | ✅ per-page `metadata`/`generateMetadata` | Scripted crawl of `dist/` (0 duplicates, 0 missing); live curl of 3 LMS page types |
| 5 | Exactly one H1 per page | ✅ 0 violations found | Not separately crawled (Next.js app, no static `dist/` to crawl the same way) — spot-checked homepage/catalog/detail in earlier mobile/SEO audits, all single-H1 | Scripted crawl (Astro only) |
| 6 | OG + Twitter metadata on indexable pages | ✅ (root layout + per-page) | ✅ (root layout + per-page) | Code read |
| 7 | Structured data validates, no fabricated ratings/reviews | ✅ | ✅ | Code read + live curl showing real JSON-LD output |
| 8 | No fabricated trust signals (customer counts, testimonials, stats) | ✅ (one found and fixed this audit: a hardcoded "1,480+ satisfied customers" stat with no real data behind it) | — (no such claims exist on this property) | Grep audit across both codebases |
| 9 | Business entity info (address, contact, social) consistent | ✅ single source of truth (`src/lib/site.ts`), used everywhere | N/A (no separate business-entity claims on this subdomain) | Code read |
| 10 | Language selector doesn't overclaim translation completeness | ✅ — UI chrome genuinely translated via dictionary; an explicit "not translated yet" notice shows for page body content in non-English locales | N/A | Code read |
| 11 | Blog/content actually renders published posts (not a stale "coming soon" state) | ✅ confirmed live — 10 published articles render correctly | N/A | Crawled `dist/blog/index.html` |
| 12 | Course pages generate dynamic, accurate metadata per course | N/A | ✅ `generateMetadata` per course, confirmed live with real title/description/canonical | Live curl against a real course slug |
| 13 | Course structured data (`Course` schema), no fake ratings | N/A | ✅ | Live curl, confirmed real JSON-LD, no `aggregateRating` |
| 14 | Private pages (dashboard/admin/checkout) are noindex | N/A | ✅ three layers (header, metadata, auth redirect) | Live curl: `/` has no noindex header, `/admin` does |
| 15 | No thin/duplicate catalog across the two properties | ✅ fixed this audit — removed the static `/learn/courses` snapshot, 301'd to the real dynamic catalog | ✅ (same fix) | Build verified — page no longer in Astro's page list or sitemap |
| 16 | Full test suite passes | ✅ `astro check`: 0 errors | ✅ 84/84 vitest, `tsc --noEmit` clean | Actually executed this audit, not assumed |
| 17 | Production build succeeds | ✅ 62 pages built | ✅ `next build` succeeds, includes `/robots.txt`, `/sitemap.xml` | Actually executed this audit |
| 18 | Chatbot doesn't generate indexable SEO pages / expose private data | ✅ Luna widget is client-side chat only, no page generation, no system-prompt exposure found | — | Code read (component-level, not a full pen test — see Known Limitations below) |
| 19 | Google Search Console readiness | ✅ technically ready (valid sitemap, robots, canonicals on both) | ✅ | This document + `SEO_ARCHITECTURE.md` |
| 20 | Search Console property verification + sitemap submission | ⏳ **requires account owner's GSC access — not something this session can do** | ⏳ same | N/A — documented as an external step in `LMS_PROGRESS.md` |

## Known pre-existing environment quirk (not a regression)

Four files (`CourseCard.tsx`, `ThumbnailUrlField.tsx`, `courses/[slug]/page.tsx`, `dashboard/checkout/[productId]/page.tsx`) carry an `eslint-disable-next-line @next/next/no-img-element` comment that itself errors ("Definition for rule ... was not found") because this project's flat ESLint config doesn't register that rule under that name. This was confirmed pre-existing (via `git stash` on an unmodified file) earlier this session, not introduced by any work in this audit cycle. It's a config-resolution quirk, not a real lint violation — the underlying `<img>` usage is intentional (admin-entered external URLs, generated QR data URLs) and documented inline as to why `next/image` isn't used there.

## Known limitation of this audit

Item 18's chatbot check was a code read of the Luna widget component and its API route, not a dedicated red-team pass against prompt injection or data exfiltration. If the chatbot handles anything more sensitive than general Q&A in the future (e.g. authenticated student context), it should get its own security review pass — flagged here rather than silently assumed safe.
