# Conversion Tracking Plan

**Date:** 2026-10-28. SEO success isn't just rankings and traffic — this defines what to measure and how, per the master brief's Phase 3.7. No conversion data is fabricated anywhere in this document; everything here is either a direct observation of the existing implementation or a defined measurement plan to execute once access exists.

## 1. Existing conversion paths (confirmed from the codebase, not assumed)

**Corrected 2026-11-15 (Phase 10):** the `public/api/book.php` / `public/api/contact.php` description below was accurate for the old PHP/Apache hosting setup but is now stale — the platform-consolidation merge replaced both with Node.js/database-backed handlers in the gateway app. See Section 6 for the full, re-verified architecture and why it actually improves this plan (both forms now write to a real database, not just an email side-effect).

- **`/book/`** — `BookingForm.astro` → direct `fetch()` to the gateway's `POST /admin/api/public/consultation-booking` → creates a lead + consultation + invoice + pending payment in the gateway database → confirmation email (best-effort) + client-side redirect to `/book/thanks/` (noindexed, correctly excluded from the sitemap). Requires an email field (added in a prior session's phone-removal work) — phone is now optional. **Not** `public/api/book.php`, which doesn't exist in this codebase.
- **`/contact/`** — `ContactForm.astro` → `fetch('/api/contact.php', { method: 'POST' })`, served by a Next.js route handler at that exact path (`apps/gateway/src/app/api/contact.php/route.ts`, not a real PHP script) → inserts into the `leads` table (database insert, not email, determines success; email is sent best-effort) → redirect to `/contact/thanks/` (same pattern).
- **Email CTA** — `info@shahidiqbal.com` is the only direct-contact channel referenced site-wide (confirmed via the phone/WhatsApp-removal audit from a prior session — no phone number exists anywhere on the site).
- **Luna widget** — an AI assistant chat widget present site-wide; not a form-based conversion path, but a potential pre-conversion engagement signal worth tracking separately if GA4 access is granted.
- **`/learn` course enrollment and personal-training request** — two additional conversion paths outside the main marketing site, newly mapped in Section 6: free/paid course checkout (writes to `enrollments`/`orders`) and personal-training requests (writes to `trainingRequests`).

## 2. What needs to be measured (and currently isn't, without GA4/GSC access)

| Metric | Why it matters | How to capture it |
|---|---|---|
| `/book/thanks/` and `/contact/thanks/` pageviews, segmented by landing page and traffic source | The actual conversion event — did an organic visitor from a GCC location page submit the form? | GA4 goal/conversion event on reaching these two URLs, or server-side logging in `book.php`/`contact.php` if GA4 isn't available |
| Organic sessions by country, specifically Saudi Arabia/Qatar/UAE/Oman/Bahrain/Kuwait | Confirms whether GCC-targeted content is actually reaching the right audience | GA4 geography report, cross-referenced with GSC country performance |
| Which landing page a converting visitor first arrived on | Attributes conversions to specific content/pages (the new location pages, service pages, blog posts) | GA4 landing-page + conversion-path report |
| Luna widget engagement (opened chat, sent a message) by page | A pre-conversion signal — visitors engaging with Luna on a GCC location page is a meaningful intent signal even before a form submission | Requires adding a GA4 event to the widget's open/send actions — not currently instrumented; a small, low-risk code addition if GA4 is confirmed |
| Email clicks (`mailto:` link clicks) | A conversion path GA4 doesn't track automatically | GA4 enhanced measurement (outbound/mailto click tracking) once enabled |

## 3. What this plan explicitly does NOT do

- **No fabricated conversion numbers, lead counts, or conversion rates anywhere in this project's reports.** Every number in a future report will be either a real figure from GA4/GSC/server logs, or explicitly absent with the reason stated.
- **No new personal-data collection beyond what the existing forms already capture** (name, email, message/scope) — no new tracking that requires additional consent beyond what's already in place, and no change to `src/content/legal/privacy.mdx` is proposed without a documented reason.
- **No claim that a specific SEO change caused a specific conversion change** without a defensible before/after comparison window — per the master brief, "report actual results without... attributing every change to the most recent implementation."

## 4. Recommended lightweight implementation (once GA4 access exists)

1. **Confirmed this session: no GA4, Google Tag Manager, or any analytics script exists anywhere on the site** (`grep` across `src/` and the full `dist/` build output for `gtag`, `googletagmanager`, `google-analytics`, and any GA measurement ID pattern — zero matches). This is a real baseline fact, not an assumption.
2. This means GA4 installation itself is a **P1 implementation task**, not a configuration step — it requires adding a new third-party script site-wide, which needs explicit owner approval before deployment (consistent with "Do not... make risky production changes without explicit authorization") and a quick privacy-policy consistency check (does `src/content/legal/privacy.mdx` already describe analytics usage, or does it need a one-line update once this ships).
3. Once installed and confirmed working: configure the two thank-you-page URLs as conversion events (GA4 console configuration, no further code change needed).
4. Add the Luna-widget open/send event only after GA4 is confirmed working — small, reversible, low-risk addition once the measurement foundation exists.

## 5. Baseline reporting format (for Phase 6)

Once data exists, every measurement report in this project will use this structure (also defined in `12_MONTHLY_REPORT_TEMPLATE.md`):

```
Reporting date: [date]
Comparison period: [previous period, same length]
Organic clicks: [real number] (vs. [previous])
Impressions: [real number] (vs. [previous])
CTR: [real number]
Average position: [real number]
Target-country metrics: [Saudi Arabia / Qatar / UAE broken out]
Conversions (book/thanks + contact/thanks): [real number] (vs. [previous])
Known limitations this period: [stated plainly]
```

No cell in that structure is ever filled with an estimate presented as a real figure.

## 6. Conversion event definitions and codebase mapping (added 2026-11-15, Phase 10)

Re-read this entire plan against the current codebase for Phase 10 (Core Web Vitals + analytics/conversion audit). Sections 1–5 above were re-verified and remain accurate except for the `book.php`/`contact.php` correction folded into Section 1. This section defines the five conversion events this project should track once GA4/analytics is approved and installed, each tied to a real, concrete action in the codebase today — not a generic placeholder.

| Event name | Fires on | Concrete source in this codebase |
|---|---|---|
| `generate_lead` | Any successful contact-form or consultation-booking submission | Umbrella event for the two rows below — both ultimately create a row in the gateway's `leads` table |
| `consultation_request` | `BookingForm.astro` submission on `/book/` or `/pricing/` | `fetch()` to `https://shahidiqbal.com/admin/api/public/consultation-booking` (`apps/gateway/src/app/admin/api/public/consultation-booking/route.ts`), via `bookPaidConsultation()` — creates lead + consultation + invoice + pending payment; client redirects to `/book/thanks/` on success |
| `contact_form_submit` | `ContactForm.astro` submission on `/contact/` | `fetch('/api/contact.php', { method: 'POST' })`, handled by `apps/gateway/src/app/api/contact.php/route.ts` — inserts into `leads`; client redirects to `/contact/thanks/` on success. The form's `service` field is already captured server-side, giving a ready-made segmentation parameter (which of the 10 listed services the lead is interested in) for this event once GA4 exists |
| `course_enquiry` | Enrollment/checkout start on a `/learn` course | Free courses: `enrollFree()` server action (`apps/gateway/src/app/learn/dashboard/checkout/[productId]/free-enroll-action.ts`) → `enrollInFreeCourse()`, redirects to `/dashboard/courses?enrolled=1`. Paid courses: `submitPayment()` server action (`.../checkout/[productId]/actions.ts`) → `submitManualPayment()` (`apps/gateway/src/learn-core/lib/checkout.ts`), redirects to `/dashboard/orders?submitted=1`. Both write to `enrollments`/`orders` (`apps/gateway/src/admin-core/db/schema/learn/enrollment.ts`) |
| `training_enquiry` | Personal-training request submission at `/learn/dashboard/personal-training` | `submitPersonalTrainingRequest()` server action (`apps/gateway/src/app/learn/dashboard/personal-training/actions.ts`) → `submitTrainingRequest()` (`apps/gateway/src/learn-core/lib/personalTraining.ts`) → inserts into `trainingRequests` (no price/order row yet — pricing happens later via `acceptTrainingRequestOffer()` once a quote is given) |

**Why this matters beyond the event names themselves:** `consultation_request` and `contact_form_submit` conversions are not purely a client-side GA4 concern. Both already write a durable, structured database row today (`leads`, plus `consultations`/`invoices`/`payments` for bookings) — independent of whether GA4 is ever installed. This means real lead *counts* (though not traffic-source attribution) could in principle be pulled from the gateway's own database as a cross-check against GA4's thank-you-page pageview counts once GA4 ships, which is a more reliable conversion count than a pageview-based goal alone. This doesn't reduce the need for GA4 (no attribution, no landing-page/traffic-source breakdown without it) — it's additional, independently-verifiable ground truth once both exist side by side.

No implementation changed as a result of this section — this is documentation and mapping only, consistent with Section 3's rules and the project's standing P1/owner-approval requirement (`SEO_PRIORITY_MATRIX.md` finding F4) before any analytics script is installed.
