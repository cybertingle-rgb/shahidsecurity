# Pricing, Paid Consultations & Currency Conversion

Covers the public `/pricing/` page on shahidiqbal.com, the paid consultation booking flow, and the
admin-managed pricing data behind both. Read `docs/SOC_READINESS.md` first for why 24/7 Managed Detection &
Response is gated and defaults to unavailable.

## Architecture at a glance

The Astro marketing site (`shahidiqbal.com`) is static — it has no backend of its own. `apps/admin` is the
one real server/database in this project with business data (leads, consultations, payments, invoices), so
it owns all pricing data and the consultation booking flow. The Astro site talks to it the same way the Luna
widget already talks to `apps/learn`: a build-time fetch for the USD figures baked into the static HTML
(crawlable, no JS needed for SEO), plus client-side `fetch()` calls (CORS-enabled, no cookies) for
per-visitor currency conversion and the booking form submission.

```
shahidiqbal.com (Astro, static)          admin.shahidiqbal.com (Next.js, apps/admin)
  /pricing/  ──build-time fetch───────►  GET  /api/public/pricing-plans
  /pricing/  ──client-side fetch──────►  GET  /api/public/pricing-plans?currency=XXX
  /pricing/, /book/ ──client-side─────►  GET  /api/public/geo-currency
  /book/     ──client-side fetch──────►  POST /api/public/consultation-booking
```

No new backend, database, or lead system was introduced — this reuses the existing `leads`, `consultations`,
`customers`, `invoices`, and `payments` tables (apps/admin/src/db/schema/crm.ts) and the existing
manual-payment-pending pattern apps/learn's checkout already uses, rather than duplicating any of it.

## USD source of truth

Every price is entered once, in USD, in `apps/admin`'s `pricing_plans` / `add_on_services` /
`consultation_settings` tables (`apps/admin/src/db/schema/pricing.ts`), editable at
`/dashboard/pricing`, `/dashboard/pricing/plans`, `/dashboard/pricing/add-ons`. Nothing on the public site
hardcodes a number — the Astro page and the booking form both read these values live (or at build time) via
`/api/public/pricing-plans`. Changing a price in the admin dashboard changes it everywhere the next time
that page is built or re-fetched, with no other file to edit.

Initial content (the specific plans/add-ons/prices in the original brief) is seeded idempotently via
`apps/admin/src/lib/pricing/seedPricingData.ts` — run once with `pnpm db:seed-pricing` (shell access) or
`POST /api/internal/seed-pricing-data` (no shell access, secret-gated by `SEED_SECRET`). It never overwrites
a row an admin has since edited.

## Currency conversion

- **Country → currency map**: `apps/admin/src/lib/pricing/currency.ts` — covers every currency the brief
  explicitly names plus the rest of the Eurozone and the other major economies likely to send inbound
  interest. Anything unmapped falls back to USD, per the brief's explicit requirement.
- **Country detection** (`apps/admin/src/lib/pricing/geo.ts`, exposed via `GET /api/public/geo-currency`):
  1. A CDN/edge geo header, if one is ever in front of the app (not currently the case on this host).
  2. An IP-based lookup against `ipwho.is` (free, keyless) using the visitor's IP from `x-forwarded-for`.
  3. A client-supplied `?localeRegion=XX` (from `Intl.NumberFormat().resolvedOptions().locale`'s region
     subtag) as the brief's "browser locale as fallback" step — a server can't read a browser's locale on
     its own, so the client sends it.
  4. USD, final fallback. Never requests anything more precise than a country — no GPS, ever.
- **FX rates** (`apps/admin/src/lib/pricing/fxRates.ts`): fetched from **open.er-api.com** (free, keyless;
  updates roughly daily) and cached in the `fx_rates` table. `POST /api/internal/refresh-fx-rates`
  (secret-gated by `FX_REFRESH_SECRET`) does the fetch+cache; wire it to an external cron (Hostinger hPanel
  → Cron Jobs) every ~6 hours — see that route's own comment for why that cadence. A rate older than 36h is
  flagged stale but still served (an old rate beats no rate); a currency with no cached rate at all falls
  back to USD automatically (`convertFromUsd`'s `usedFallback` flag).
  - **Verification note, stated plainly rather than assumed**: this sandbox has no outbound access to
    verify open.er-api.com's exact response shape directly (only an HTTPS allowlist a handful of domains
    wide) — the integration is built against that provider's long-stable, publicly documented contract, with
    runtime guards that fail safe (fall back to cached/USD) on any shape mismatch, but confirming it against
    the real endpoint from production is a genuine step still owed once `FX_REFRESH_SECRET` is set and the
    cron is wired up. Check the audit log (`fx_rates.refreshed`) after the first real cron run.
- **Manual override**: the currency `<select>` on `/pricing/` and the fee display on `/book/` persist the
  visitor's manual choice in `localStorage` (key `shahid-security-currency`) — it overrides detection for
  that browser until they change it again or pick "Auto-detect".
- **Decimal formatting** (`currency.ts`'s `formatCurrencyAmount`/`decimalPlacesFor`): zero-decimal
  currencies (JPY, KRW, VND, IDR, HUF) and three-decimal currencies (OMR, BHD, KWD, JOD) are handled
  explicitly, not left to Intl's defaults.
- **Commercial safeguard**: every converted figure is labeled an estimate; invoices and actual charges are
  always in USD (`bookPaidConsultation` hardcodes the invoice currency to USD regardless of what the visitor
  was shown) — the currency is never silently changed at checkout.

## Paid consultation booking

The owner's decision is explicit: **the initial consultation is paid, never free.** `consultation_settings`
(fee, duration, refundable flag, refund policy text) is admin-editable at `/dashboard/pricing`.

Flow (`apps/admin/src/lib/pricing/consultationBooking.ts`, called from
`POST /api/public/consultation-booking`):

1. Visitor fills the form on `/book/` (full name, email, company, country, industry, website, company size,
   employee count, security concern, preferred package, date/time, timezone, additional info).
2. The form has already fetched and displayed the fee in the visitor's detected/selected currency.
3. On submit: a `lead`, a `consultation` row (with every one of the fields above — see the "paid-consultation
   fields" on the `consultations` table, all nullable so the legacy free book.php path is unaffected), a
   `customer` (found-or-created by email), an `invoice` (USD, status `sent`), and a `payment` (status
   `pending`, provider `manual`) are all created in one call.
4. Best-effort notification emails go to both the business's own contact address and the visitor
   (`sendEmail` — degrades to a console log if SMTP isn't configured, never fails the booking itself).
5. **No payment gateway is configured** in this app (`apps/admin/src/lib/payments.ts`'s
   `paymentProviderStatus()` — `PAYMENT_PROVIDER` defaults to `'manual'`). The booking never claims payment
   was received; it's always `pending` until an admin verifies it the same way any other manual payment is
   verified today (`/dashboard/payments`). Wiring a real gateway (Stripe et al.) is explicitly out of scope
   here — it would need real credentials nobody has supplied, and "do not create a fake payment system" is a
   hard rule either way.
6. Admins see and manage every booking, including the new fields and a link to the linked invoice, at
   `/dashboard/leads/consultations`.

**Residual risk, flagged rather than assumed away**: this relies on production MySQL's `max_allowed_packet`
and the booking flow's own payload size being well within normal limits (consultation bookings are small
JSON payloads, nothing like the media-upload issue elsewhere in this codebase) — not expected to be an
issue, but worth knowing if a booking ever fails with a database error.

## Admin management

- `/dashboard/pricing` — consultation fee/duration/refund policy, 24/7 SOC availability toggle.
- `/dashboard/pricing/plans` — create/edit/activate/disable/delete pricing plans.
- `/dashboard/pricing/add-ons` — same, for one-off specialist services.
- `/dashboard/leads/consultations` — extended to show the new paid-consultation fields, fee, and a link to
  the payment status.
- RBAC: new `pricing.manage` permission, granted to the `administrator` and `finance` roles
  (`apps/admin/src/lib/seedSuperAdmin.ts`) — re-run the seed (idempotent) to pick it up on an existing
  installation.

## Environment variables (apps/admin)

| Variable | Purpose |
|---|---|
| `FX_REFRESH_SECRET` | Gates `POST /api/internal/refresh-fx-rates` — wire to an external cron every ~6h |
| `SEED_SECRET` | Gates `POST /api/internal/seed-pricing-data` (shared with seed-super-admin) |

No new variables are required for the booking flow itself or for currency detection — both work with zero
configuration beyond a normal deploy (FX rates simply stay at whatever was last cached, or fall back to USD,
until the cron is wired up).

## Known limitations

- **No live payment gateway** — every consultation booking is payment-pending until manually verified, by
  design (see above).
- **FX rate provider not live-verified from this environment** — see the verification note above.
- **No CAPTCHA/Turnstile on the new booking form** — the previous `book.php`-backed form had an optional
  Cloudflare Turnstile integration; the new form (posting directly to `apps/admin`) currently relies on a
  honeypot field and per-IP rate limiting (`10/hour` on `/api/public/consultation-booking`) only. Worth
  adding Turnstile here too if spam becomes a problem.
- **24/7 Managed Detection & Response is not operationally built** — see `docs/SOC_READINESS.md`. The
  pricing/billing side is fully built; the actual SIEM/EDR/ticketing/on-call operation behind it is not, and
  deliberately stays unsellable (`requires24x7Readiness` + `soc_readiness_settings.availability = 'disabled'`
  by default) until it is.
- **Multi-language**: the `/pricing/` page's body content is English-only, consistent with how every other
  content page on this site works (nav/footer chrome is localized via `src/lib/i18n.ts`; page bodies are
  not). Translating the full pricing page content was out of scope for this change.
