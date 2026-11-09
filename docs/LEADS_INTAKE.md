# Leads intake: shahidiqbal.com contact form → database

## Current mechanism (post platform-consolidation merge)

`shahidiqbal.com` was originally a statically-generated Astro site on PHP/
Apache shared hosting, with two real PHP+PHPMailer forms (`contact.php`,
`book.php`) that had no server-side database access of their own — hence
the cross-process HTTP relay this doc used to describe below.

The platform-consolidation merge (`docs/consolidation/
UNIFIED_ARCHITECTURE.md`) moved `shahidiqbal.com` onto Node.js hosting, in
the same process as the admin app's database. That changed two things:

1. **The PHP scripts stopped working entirely.** A Node.js host has no PHP
   runtime: `public/api/contact.php` and `public/api/book.php` were served
   as static files (GET-only, via `src/app/[[...slug]]/route.ts`), so every
   POST from the contact form got a 405 and the form was silently broken
   from the merge until this was found and fixed. The static `.php` files
   have been deleted — they also leaked their own source over a plain GET,
   which doesn't matter once they're gone.
2. **The relay is no longer needed.** `apps/gateway/src/app/api/contact.php/
   route.ts` (same URL the old form posted to, so `src/components/
   ContactForm.astro` needed no changes) now writes directly into the
   `leads` table via Drizzle — no HTTP call, no shared secret, no
   reachability question, because it's the same process and the same
   database connection the admin dashboard itself uses.

The booking form (`src/components/BookingForm.astro`) never used
`book.php` to begin with on this architecture — it posts straight to
`/admin/api/public/consultation-booking`, which already writes to
`leads`/`consultations`/`customers`/`invoices` directly (see
`src/admin-core/lib/pricing/consultationBooking.ts`).

## Email

The contact route sends a notification email to `info@shahidiqbal.com` and
an auto-reply to the visitor via `src/admin-core/lib/email.ts`, best-effort:
if `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` aren't set in this
app's environment, it logs and moves on rather than failing the
submission — the `leads` row (the part that actually matters for not
losing an enquiry) is written first and independently of whether email
succeeds. Set those four variables in Hostinger's Node.js environment
variables panel to enable real email delivery; until then, every
submission is still fully captured in the admin dashboard's **Customers &
Leads** section.

## The old cross-process relay (historical, no longer in use)

The now-deleted `apps/admin/src/app/api/public/leads-intake` route (still
present in this codebase as `src/app/admin/api/public/leads-intake/
route.ts`, unused by anything now) was the original design for a PHP
script with no DB access to notify a separate Next.js app over HTTP, with
a shared `LEADS_INTAKE_SECRET`. It's harmless to leave in place but nothing
calls it anymore; it can be removed in a future cleanup pass.
