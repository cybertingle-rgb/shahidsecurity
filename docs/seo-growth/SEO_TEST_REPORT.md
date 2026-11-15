# SEO Test Report — Phase 10 (Core Web Vitals + Analytics/Conversion Audit)

**Date:** 2026-11-15. This report contains only numbers actually measured in this session (Part A) and a factual, grep-verified statement of what exists in the codebase (Part B). No traffic, ranking, or conversion-rate numbers are included anywhere, because no live Search Console or GA4 access exists in this session — consistent with every prior phase of this project.

---

## Part A — Core Web Vitals (real Lighthouse measurements)

### Method

- Built the production site with `pnpm build` (Astro 7, 242 pages generated, build succeeded).
- Served the build with `pnpm preview --host 127.0.0.1 --port 4321` (Astro's own preview server, i.e. the production build, not `astro dev`).
- Ran the actual **Lighthouse CLI** (`pnpm dlx lighthouse@13.6.0`) against that local server, pointed at the pre-installed Chromium at `/opt/pw-browsers/chromium` via `CHROME_PATH`, with `--chrome-flags="--headless=new --no-sandbox --disable-gpu"`.
- Mobile runs used Lighthouse's default mobile simulation (4x CPU slowdown, throttled "slow 4G"-equivalent network, 360×640 viewport). Desktop runs used `--preset=desktop` (no CPU throttling, faster simulated network, 1350×940 viewport).
- Every page/device combination below is a **real, successful Lighthouse run** — 10 runs total, all completed with a valid `performance` category score and a `finalUrl` matching the requested page (verified programmatically after the fact; see caveat below on one transient re-run).

Pages tested: `/` (home), `/services/penetration-testing/`, `/blog/zero-trust-architecture-smb-guide/`, `/locations/pakistan/`, `/pricing/`.

### Results — measured values

| Page | Device | LCP | CLS | TBT (INP proxy) | TTFB | Lighthouse Perf Score |
|---|---|---|---|---|---|---|
| Home (`/`) | Mobile | **1.21 s** | **0.0003** | **41 ms** | **7 ms** | 100 |
| Home (`/`) | Desktop | **0.29 s** | **0.0006** | **347 ms** | **6 ms** | 84 |
| Pentest service | Mobile | **1.06 s** | **0.0003** | **31 ms** | **5 ms** | 100 |
| Pentest service | Desktop | **0.30 s** | **0.0002** | **364 ms** | **4 ms** | 83 |
| Blog post (zero-trust guide) | Mobile | **0.91 s** | **0.0003** | **391 ms** | **11 ms** | 91 |
| Blog post | Desktop | **0.26 s** | **0.0002** | **384 ms** | **10 ms** | 83 |
| Pakistan location page | Mobile | **1.06 s** | **0.0002** | **101 ms** | **8 ms** | 99 |
| Pakistan location page | Desktop | **0.29 s** | **0.0002** | **406 ms** | **5 ms** | 82 |
| Pricing | Mobile | **1.06 s** | **0.0003** | **148 ms** | **8 ms** | 98 |
| Pricing | Desktop | **0.31 s** | **0.0002** | **386 ms** | **4 ms** | 83 |

### Measured vs. target — explicit pass/miss (never implied as achieved unless actually measured within)

Google's Core Web Vitals "Good" thresholds are shown for comparison only — they are **targets**, not measurements:

| Metric | Google "Good" target | Result across the 10 runs |
|---|---|---|
| LCP | ≤ 2.5 s | **PASS on all 10** (worst case: Home/Mobile at 1.21 s, 48% of budget) |
| CLS | ≤ 0.1 | **PASS on all 10**, by a huge margin (0.0002–0.0006, effectively zero layout shift) |
| INP / TBT proxy | ≤ 200 ms | **PASS on 4/5 mobile pages** (Home 41 ms, Pentest 31 ms, Pakistan 101 ms, Pricing 148 ms). **MISS on Blog/Mobile** (391 ms) and **MISS on all 5 desktop pages** (347–406 ms) — all of these misses fall in the "Needs Improvement" band (200–600 ms), none in "Poor" (>600 ms) |
| TTFB | commonly tracked at ≤ 800 ms | **PASS on all 10** (4–11 ms) — see caveat below, this is a localhost measurement |

**No page meets the bar on every single metric with zero caveats except via the TBT proxy, and the TBT misses are real and consistent — not close calls that round up to "pass."**

### Why TBT instead of INP, and what that means

Lighthouse's standard navigation-trace mode (what `lighthouse <url>` runs) **does not produce an INP value** — the `interaction-to-next-paint` audit came back `null` in all 10 JSON results, because INP requires a real user interaction (click, tap, keypress) during a recorded session, and a plain page-load trace never performs one. A genuine INP number needs either real-user field data (CrUX — not available without GSC/GA4 access) or Lighthouse's separate User Flow / timespan API driving synthetic interactions, which was out of scope for this page-load audit.

**Total Blocking Time (TBT) was used instead**, which is Lighthouse's own documented lab proxy for responsiveness — it shares the same ≤200 ms "Good" boundary and the same intent (measuring main-thread availability for input) as INP. The TBT numbers above are real, not estimated.

### Root cause found for the TBT misses (concrete, verified)

Every one of the 10 Lighthouse traces' `long-tasks` audit points to the same culprit: **`src/components/CursorParticles.astro`**, a sitewide decorative canvas cursor-particle-trail effect rendered once from `BaseLayout` on every page. Individual long tasks attributed to this one script ranged from 50 ms to 320 ms per task, and it is the single largest contributor to main-thread blocking on every page/device combination tested — not page-specific content (blog syntax highlighting, pricing calculators, etc.), but one shared layout-level script. It sizes its `<canvas>` to `window.innerWidth * devicePixelRatio`, so the wider desktop viewport (1350px) does measurably more per-frame work than mobile (360px), which is consistent with desktop TBT being higher than mobile TBT here — the opposite of the usual mobile-throttling pattern, and explained by this one script rather than by anything wrong with the throttling setup.

**This is the single highest-leverage, concrete performance fix identified in this audit**: deferring, throttling the particle count, or skipping `CursorParticles.astro` on pointer-coarse (touch) devices and/or narrower viewports would likely close most of the TBT gap on every page at once, since it's a shared component, not per-page work.

### Other findings (from the same Lighthouse data + build output)

- **Render-blocking resources: 0 on every page tested** (Lighthouse's `render-blocking-resources` audit). CSS/fonts are not blocking first paint.
- **Fonts**: self-hosted via `@fontsource-variable` packages (Inter, JetBrains Mono, Space Grotesk) as local `.woff2` files — not loaded from Google Fonts or any third-party CDN. The compiled CSS confirms `font-display: swap` is in use, which is the correct practice (avoids invisible-text flash, never blocks render).
- **Third-party scripts**: the only third-party script reference found on any built page is Cloudflare Turnstile (`challenges.cloudflare.com`), and `ContactForm.astro`'s own code only injects that script on the visitor's first `focusin`/`pointerdown` inside the form — it is never loaded on initial page load and so never contributes to the LCP/TBT numbers above. No analytics, ad-tech, or other third-party script exists anywhere (see Part B).
- **Page weight**: the homepage is noticeably heavier than every other page tested — **~920 KB** total transferred (mobile trace) vs. **~280–320 KB** for the service, blog, location, and pricing pages. This wasn't root-caused further in this pass (likely hero media) but is flagged as a follow-up candidate.
- **Build-time note**: `/pricing/` and `/learn/pricing/` make a build-time fetch to the gateway's pricing API that fails in this sandboxed build (no network egress to the real API) and falls back gracefully — the build still completes and the page still renders; this is a sandbox limitation, not a site bug, but worth re-confirming against the real production API after deploy.

### Caveats on this data (stated plainly, not glossed over)

- **This is a single local lab run, not CrUX/field data.** All ten runs were against `127.0.0.1` with no real network latency, no CDN, no DNS/TLS handshake, and no distance from GCC-region visitors — the sub-10ms TTFB and sub-second desktop LCP values reflect that, not real-world performance. They should not be read as "the site loads this fast for a visitor in Riyadh."
- **One transient failure during this run, resolved and re-verified**: partway through testing, an unrelated background process in this container (`apps/gateway`'s own monorepo build script, started automatically, not by this audit) rebuilt and then relocated the root `dist/` directory, which caused a few seconds of HTTP 404s from the preview server. This caused one Lighthouse run (Home/Desktop) to fail with a 404 runtime error; it was re-run after confirming the server was serving 200s again, and succeeded. All 10 final JSON results were checked programmatically to confirm each one's `finalUrl` matches the intended page before being used in this table — none of the numbers above come from a run affected by that interruption.
- **Lighthouse performance scores (84, 100, 83, 91, 83, 99, 82, 98, 83, …) are included for context but are not Core Web Vitals themselves** — they're a weighted composite Lighthouse computes from several lab metrics, shown here alongside the raw metric values for reference only.

---

## Part B — Analytics / conversion-tracking audit

### 1. Analytics is still absent — re-verified, not assumed

Re-ran the grep sweep the prior audit used, across `src/` and `apps/gateway/src/`, specifically for:

- `gtag(`, `googletagmanager`, `google-analytics`, `dataLayer`, `GA_MEASUREMENT_ID`, `gtag/js`
- Facebook Pixel (`fbq(`), Hotjar, Segment, Mixpanel, Plausible, Fathom, Microsoft Clarity

**Zero matches for any tracking script, call, or measurement ID anywhere in `src/` or `apps/gateway/src/`.**

The only hits for the literal word "analytics" are:
- Prose in three blog posts referring to third-party "blockchain analytics firms" (Elliptic) and generic "third-party analytics scripts" in an e-commerce/PCI-DSS content page — editorial content, not code.
- `src/content/legal/privacy.mdx` line 30, which **states that the site does not use tracking cookies, analytics scripts, or third-party advertising pixels** — i.e. the privacy policy's own text confirms the same zero-analytics baseline the code shows.

**This confirms the prior audit's finding still holds: no GA4, no Google Tag Manager, no analytics or ad-tech script of any kind exists anywhere in this codebase.** As before, no analytics script was installed or modified in this session — that remains a P1 implementation task requiring explicit owner approval (per `SEO_PRIORITY_MATRIX.md` finding F4), and this phase did not touch it.

### 2. No real traffic/conversion numbers — confirmed, none fabricated

No Search Console or GA4 access exists in this session (confirmed in prior phases, unchanged). No traffic, impression, click, or conversion numbers appear anywhere in this report or in the updated plan — only the concrete, codebase-verified mapping below, which exists specifically so the eventual GA4/GTM implementation has a precise target to instrument against.

### 3. Conversion-event-to-codebase mapping (concrete, not generic)

| Event name | Fires on | Concrete implementation in this codebase |
|---|---|---|
| `generate_lead` | Any successful contact-form or consultation-booking submission that results in a lead record | Umbrella event covering both rows below — maps to a new row in the `leads` table (`apps/gateway/src/admin-core/db/schema`), written by either `apps/gateway/src/app/api/contact.php/route.ts` (contact form) or `bookPaidConsultation()` in `apps/gateway/src/admin-core/lib/pricing/consultationBooking.ts` (booking form, which also creates a consultation + invoice + pending payment, not just a lead) |
| `consultation_request` | Visitor submits `src/components/BookingForm.astro` on `/book/` or `/pricing/` | Client-side `fetch()` to `https://shahidiqbal.com/admin/api/public/consultation-booking` (`apps/gateway/src/app/admin/api/public/consultation-booking/route.ts`), then client redirect to `/book/thanks/` on success. **Corrects the prior plan**: this does *not* go through `public/api/book.php` — see Section 4 below. |
| `contact_form_submit` | Visitor submits `src/components/ContactForm.astro` on `/contact/` | Client-side `fetch('/api/contact.php', { method: 'POST' })`, handled by the Next.js route `apps/gateway/src/app/api/contact.php/route.ts` (a `route.ts` file inside a folder literally named `contact.php`, so the URL path is unchanged), then client redirect to `/contact/thanks/` on success. The form's own `service` field (`Penetration Testing`, `Vulnerability Assessment`, … `Not sure`) is already captured server-side and gives a ready-made event parameter for service-interest segmentation once GA4 exists. **Corrects the prior plan**: this is not a PHP script — see Section 4. |
| `course_enquiry` | Visitor enrolls in or starts checkout for a `/learn` course | Two concrete paths depending on price: `enrollFree()` server action (`apps/gateway/src/app/learn/dashboard/checkout/[productId]/free-enroll-action.ts`, calls `enrollInFreeCourse()`) for free courses, redirecting to `/dashboard/courses?enrolled=1`; `submitPayment()` server action (`apps/gateway/src/app/learn/dashboard/checkout/[productId]/actions.ts`, calls `submitManualPayment()` in `apps/gateway/src/learn-core/lib/checkout.ts`) for paid courses, redirecting to `/dashboard/orders?submitted=1`. Both write a row to the `enrollments`/`orders` tables (`apps/gateway/src/admin-core/db/schema/learn/enrollment.ts`). |
| `training_enquiry` | Visitor submits a personal-training request from `/learn/dashboard/personal-training` | `submitPersonalTrainingRequest()` server action (`apps/gateway/src/app/learn/dashboard/personal-training/actions.ts`) calls `submitTrainingRequest()` (`apps/gateway/src/learn-core/lib/personalTraining.ts`), which inserts into the `trainingRequests` table — deliberately with no price/order row at submission time (pricing happens later via `acceptTrainingRequestOffer()` once Shahid quotes the engagement). |

### 4. A genuinely new finding this phase: both marketing-site forms already write to a real database, independent of GA4

While mapping the events above, this audit found that the existing `10_CONVERSION_TRACKING_PLAN.md` (2026-10-28) describes `/book/` and `/contact/` as posting to `public/api/book.php` / `public/api/contact.php` — **real PHP+PHPMailer scripts**. That is no longer accurate:

- Neither `.php` file exists as an actual PHP script anywhere in this repository today. `public/api/book.php` doesn't exist at all (the comment in `BookingForm.astro` calls it "legacy"). A static `contact.php` file is still copied into `astro-dist/` by the Astro build, but — per the comment at the top of `apps/gateway/src/app/api/contact.php/route.ts` — after the platform-consolidation move from PHP/Apache hosting to this Node.js app, that static file would only ever be served as a dead GET-only asset; a dedicated `route.ts` at the exact same URL path (`/api/contact.php`, achieved by naming the folder itself `contact.php`) now handles the real `POST` traffic.
- That route **inserts directly into a `leads` table** in the gateway's own database — not just a best-effort email side-effect. Email sending is now best-effort/non-blocking; the database insert is what determines success.
- `BookingForm.astro` was never wired to `book.php` in the first place in the current codebase — it always posts straight to the gateway's `consultation-booking` API, which creates a lead **plus** a consultation, an invoice, and a pending-payment record.

**Practical implication for this plan**: once GA4 exists, `generate_lead`/`consultation_request`/`contact_form_submit` won't be purely client-side GA4 events measuring an arbitrary thank-you-page view — there is already a server-side source of truth (the `leads`, `consultations`, and `orders`/`enrollments` tables in the gateway's database) that can be cross-referenced against GA4 session data for a much more reliable lead count than pageview-based GA4 goals alone would give. This doesn't replace the need for GA4 (it has no attribution/traffic-source data), but it means conversion *counts* don't depend on GA4 being installed correctly — they already exist today, just not yet exposed as a report.

### 5. Was the existing conversion tracking plan still accurate?

**Partially — Section 1 (existing conversion paths) needed a factual correction, and a new section was needed for the 5 named events and the gateway's course/training flows, which the original plan (written before this phase's codebase re-reading) did not cover at all.** Everything else in the plan — the "what needs to be measured" table, the explicit non-fabrication rules, the P1/owner-approval requirement for installing GA4, and the baseline reporting format — was re-checked against the current codebase and **remains accurate**; it was left untouched. See `10_CONVERSION_TRACKING_PLAN.md`, updated in this same phase with a corrected Section 1 and a new Section 6 covering the event mapping above.
