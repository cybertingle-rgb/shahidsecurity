# SEO Architecture — Shahid Security + Learn with Shahid

What's actually implemented, as of this audit (2026-10), across both properties. This documents the real, current state — not a proposal. Where something is a future recommendation rather than built, it's labeled as such.

## Two properties, one strategy

- **`shahidiqbal.com`** (Astro, static) — "Need cybersecurity protection?" B2B consulting: services, industries, case studies, blog, lead generation.
- **`learn.shahidiqbal.com`** (Next.js, dynamic) — "Want to learn cybersecurity?" education: courses, roadmap, student enrollment.

They cross-link deliberately (homepage → Learn, Learn footer → Shahid Security, `/learn` guide page → the real course catalog) but don't target the same keywords for the same intent — a consulting-services query should never compete against a course-enrollment query for the same ranking.

## Canonical strategy

Both sites use `trailingSlash: 'always'` (Astro) / explicit `alternates: { canonical }` per page (Next.js). Apache enforces the trailing slash at the HTTP level (`public/.htaccess`) for `shahidiqbal.com` — any request without one gets a 301 to the slashed version, so there's exactly one canonical form, not two divergent ones a crawler could index separately.

Known 301s in place (`public/.htaccess`): legacy WordPress URLs, old service-slug variants, and (as of this audit) the removed static `/learn/courses` page → `https://learn.shahidiqbal.com/courses`, since the real catalog now lives in the LMS app and a static build-time snapshot of the same listing would have been duplicate content.

## Sitemap strategy

- **`shahidiqbal.com/sitemap.xml`** — `@astrojs/sitemap`, auto-generated from the build output. Picks up every real `.astro` page automatically; nothing hardcoded, nothing stale (confirmed: removing `/learn/courses` this audit automatically dropped it from the next build's sitemap with no manual edit).
- **`learn.shahidiqbal.com/sitemap.xml`** — `apps/learn/src/app/sitemap.ts`, generated per-request from real `courses` table rows (`status = 'published'` only) plus the fixed public routes (`/`, `/courses`, `/login`, `/register`). A course that's archived or still in draft is never in the sitemap; one that's newly published appears on the very next sitemap fetch with no redeploy needed.

Neither sitemap includes admin, dashboard, API, or checkout routes — those aren't indexable pages to begin with (see Robots strategy).

## Robots strategy

- **`shahidiqbal.com/robots.txt`** — allows everything except the handful of thin/non-indexable paths (`/contact/thanks/`, `/book/thanks/`, blog tag archives — see below).
- **`learn.shahidiqbal.com/robots.txt`** (`apps/learn/src/app/robots.ts`) — allows `/` by default, disallows `/dashboard/`, `/admin/`, `/api/`, `/reset-password`, `/verify-email`. This was a real fix this audit cycle: the entire LMS app previously sent a blanket `noindex, nofollow` on every path (`next.config.mjs`'s `X-Robots-Tag` header, plus a matching root-layout metadata default) — leftover from before the homepage/catalog/course pages existed as this app's own public surface. Rescoped to only the genuinely private paths; see `LMS_PROGRESS.md`'s 2026-10 rework section for the full story.

Robots.txt is never relied on as the *only* protection for private areas — `/dashboard/*` and `/admin/*` also require a valid session server-side (redirect to `/login` otherwise) and carry an explicit `robots: {index:false}` metadata export, three independent layers for the same guarantee.

## Structured data (JSON-LD) strategy

Validated by direct inspection of real rendered pages, not assumed from source:

| Page type | Schema | Where |
|---|---|---|
| Homepage | `ProfessionalService`, `WebSite` | `src/lib/schema.ts` |
| Service pages | `Service`, `BreadcrumbList`, `FAQPage` | `src/lib/schema.ts`, used by `src/pages/services/[slug].astro` |
| Blog posts | `BlogPosting`, `Person` (author) | `src/lib/schema.ts` |
| Case studies | `Article` | `src/pages/case-studies/[slug].astro` |
| LMS homepage | `WebSite`, `FAQPage` | `apps/learn/src/app/page.tsx` |
| Course detail pages | `Course` (+ `Offer` when priced) | `apps/learn/src/app/courses/[slug]/page.tsx` |

**No `AggregateRating` or `review` schema exists anywhere on either site.** This is deliberate, not an oversight — neither property has a real, verified rating/review system backing one, and the project's standing rule (reaffirmed throughout this session, including removing a fabricated "1,480+ satisfied customers" stat this audit cycle) is to never mark up a claim that isn't genuinely true and visible on the page.

## Indexing strategy

| Area | Indexable? | Enforced by |
|---|---|---|
| `shahidiqbal.com` services, blog, case studies, industries, about, contact, home | Yes | default (nothing blocks it) |
| `shahidiqbal.com/*/thanks/` | No | per-page `noindex` meta |
| `shahidiqbal.com/blog/tag/*` | `noindex, follow` | thin auto-generated archive pages — kept crawlable for link equity, kept out of the index since they're not unique content |
| `learn.shahidiqbal.com/`, `/courses`, `/courses/[slug]`, `/login`, `/register` | Yes | default (fixed this audit cycle — see above) |
| `learn.shahidiqbal.com/dashboard/*`, `/admin/*`, `/api/*` | No | `X-Robots-Tag` header + metadata + auth redirect (three layers) |
| `learn.shahidiqbal.com/reset-password`, `/verify-email` | No | metadata (these carry single-use tokens in their query string — never worth indexing even transiently) |

## Google Search Console readiness

Both sitemaps and both robots.txt files are real, correct, and already live. What remains is account-level, not technical: **Search Console property verification and sitemap submission require the account owner's own GSC access**, which this session does not have. See `LMS_PROGRESS.md`'s Next section for the exact manual steps.
