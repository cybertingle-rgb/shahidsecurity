# Conversion Tracking Plan

**Date:** 2026-10-28. SEO success isn't just rankings and traffic — this defines what to measure and how, per the master brief's Phase 3.7. No conversion data is fabricated anywhere in this document; everything here is either a direct observation of the existing implementation or a defined measurement plan to execute once access exists.

## 1. Existing conversion paths (confirmed from the codebase, not assumed)

- **`/book/`** — `BookingForm.astro` → `public/api/book.php` → confirmation email + redirect to `/book/thanks/` (noindexed, correctly excluded from the sitemap). Requires an email field (added in a prior session's phone-removal work) — phone is now optional.
- **`/contact/`** — `ContactForm.astro` → `public/api/contact.php` → redirect to `/contact/thanks/` (same pattern).
- **Email CTA** — `info@shahidiqbal.com` is the only direct-contact channel referenced site-wide (confirmed via the phone/WhatsApp-removal audit from a prior session — no phone number exists anywhere on the site).
- **Luna widget** — an AI assistant chat widget present site-wide; not a form-based conversion path, but a potential pre-conversion engagement signal worth tracking separately if GA4 access is granted.

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
