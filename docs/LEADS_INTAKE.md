# Leads intake: shahidiqbal.com → apps/admin

## Why this exists

`shahidiqbal.com` is a statically-generated Astro site on Hostinger shared
hosting with no database or server runtime of its own. Its two real forms —
`public/api/contact.php` (general enquiries) and `public/api/book.php`
(consultation requests) — have always worked by sending email via PHPMailer
over Hostinger SMTP. That remains their primary, required job and must keep
working identically whether or not `apps/admin` exists, is deployed, or is
reachable.

This integration adds a second, non-blocking step: after a real submission's
email has already sent successfully, the PHP script makes a best-effort,
short-timeout POST to `apps/admin`'s `/api/public/leads-intake` endpoint, so
the same real submission also becomes a tracked `leads` (and, for bookings,
`consultations`) row the admin team can see and work in `apps/admin`'s
dashboard.

## Failure mode

If `apps/admin` is down, unreachable, slow, or simply not configured yet
(the default — see below), the PHP side:

- Still sends the real email exactly as before.
- Still returns success to the visitor exactly as before.
- Logs a non-fatal error (`error_log`) and moves on — the curl call has a
  2s connect timeout and 3s total timeout, and every exception is caught.

Nothing about the visitor-facing contact/booking flow depends on this
integration. This mirrors the same "optional external service, never a
dependency for availability" principle this project already applies to
Google integrations.

## Configuring it

Both PHP scripts no-op the intake call entirely unless two constants are
defined in `shahid-security-config.php` (outside `public_html`, already the
project's established home for secrets — see that file's existing
`TURNSTILE_SECRET_KEY`/`SMTP_HOST` pattern):

```php
define('ADMIN_LEADS_INTAKE_URL', 'https://admin.shahidiqbal.com/api/public/leads-intake');
define('ADMIN_LEADS_INTAKE_SECRET', '<same value as apps/admin's LEADS_INTAKE_SECRET env var>');
```

Until `apps/admin` actually has a real deployed URL, leave these undefined
(or empty strings) — the functions return immediately with no effect.

## What gets sent

**From `contact.php`** (after a successful send):

```json
{ "type": "lead", "fullName": "...", "email": "...", "phone": "...", "company": "...", "message": "...", "source": "contact_form" }
```

**From `book.php`** (after a successful send) — note there is deliberately
no `email` field; the booking form never collects one (confirmation happens
over phone/WhatsApp, by that form's own long-standing design):

```json
{ "type": "consultation", "fullName": "...", "phone": "...", "country": "...", "requestedAt": "2026-12-01T09:00:00.000Z", "source": "booking_form" }
```

`country` is the free-text value the visitor typed (the form has never used
a 2-letter country-code picker) — `apps/admin`'s `consultations.country`
column is sized accordingly (`varchar(100)`), not forced into an ISO code.

`requestedAt` is converted from the form's PKT date/time fields to UTC
before sending, since every other timestamp in `apps/admin`'s database is
UTC.

## On the `apps/admin` side

`/api/public/leads-intake` ([route.ts](../apps/admin/src/app/api/public/leads-intake/route.ts)):

- Rejects with 403 unless `x-leads-intake-secret` matches `LEADS_INTAKE_SECRET`.
- Rate-limits by IP (30 requests / 15 minutes) using the same DB-backed
  limiter as login.
- For a `lead`: inserts directly into `leads`.
- For a `consultation`: inserts a `leads` row with `email` left `null` (not
  a fabricated placeholder address — see that table's schema comment) and a
  linked `consultations` row.
- Every insert is visible immediately in the admin dashboard's
  **Customers & Leads** section, with full status-change audit logging.

## Still required before this is live in production

1. Deploy `apps/admin` somewhere with a real public URL (see
   `docs/ADMIN_SETUP.md` once written, and the architecture decision in
   `docs/ADMIN_ARCHITECTURE.md`).
2. Set `LEADS_INTAKE_SECRET` in `apps/admin`'s production environment.
3. Set the matching `ADMIN_LEADS_INTAKE_URL`/`ADMIN_LEADS_INTAKE_SECRET`
   constants in `shahid-security-config.php` on the Hostinger shared-hosting
   account.

Until all three are done, the PHP side's no-op behavior (documented above)
is exactly what happens — real forms keep working, no leads are tracked yet.
