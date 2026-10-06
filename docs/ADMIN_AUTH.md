# Admin authentication: login, forgot password, bootstrap

## Login

`/admin/login` (POST `/admin/api/auth/login`). Rate-limited per IP and
per account. No public registration route exists — every `admin_users`
row is created either by an existing Super Admin, the CLI seed script,
or the HTTP seed endpoint below.

## Forgot password — Implemented

`/admin/forgot-password` → `/admin/api/auth/request-password-reset`
→ emails a single-use, 1-hour link → `/admin/reset-password?token=...`
→ `/admin/api/auth/reset-password`. Same design as `apps/learn`'s
existing, already-working reset flow:

- Only a SHA-256 hash of the token is stored
  (`admin_password_reset_tokens`) — a database read alone can never be
  replayed as a valid reset link.
- Single-use: consuming a token marks it used in the same call.
- Resetting a password invalidates every existing session for that
  account.
- The request endpoint always returns the same generic response whether
  or not the email is registered — never reveals account existence.
- Rate-limited (5 requests/hour per email).

**Email delivery** goes through `src/lib/email.ts` (nodemailer over real
SMTP). Without `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` set,
a reset request still returns success to the caller (same anti-
enumeration response either way) but the email is only logged to the
server console — not actually delivered. Set those four to a real
Hostinger mailbox (recommended: `info@shahidiqbal.com`, since that's
also the super admin account's email) to make delivery real.

## Bootstrapping the first account — Implemented, needs one manual step

Two ways to create the first Super Admin account, same underlying logic
(`src/lib/seedSuperAdmin.ts`) either way — idempotent, safe to call more
than once, never overwrites an existing account's password:

1. **CLI** (`pnpm db:seed-super-admin`) — only works on a host with
   shell access to the deployed app, which this Hostinger deployment
   does not have.
2. **HTTP** (`POST /admin/api/internal/seed-super-admin`) — the
   equivalent for a host with none, same pattern as the existing
   `/api/internal/migrate` route. Secret-gated by `SEED_SECRET`
   (header `x-seed-secret`). Example, once deployed and `SEED_SECRET`
   is set:

   ```bash
   curl -X POST https://shahidiqbal.com/admin/api/internal/seed-super-admin \
     -H "Content-Type: application/json" \
     -H "x-seed-secret: <your SEED_SECRET value>" \
     -d '{"email":"info@shahidiqbal.com","password":"<a real temporary password>"}'
   ```

   Log in with that email/password, then immediately use "Forgot
   password?" (or change it directly once a profile/settings page for
   it exists) to set a password only you know — the one used in this
   curl command was typed into a terminal and should be treated as
   already compromised.

Both paths were verified end-to-end against a local build of this app
(not this session's actual Hostinger account, which it has no access
to): seeded a real account, logged in with it, and confirmed an
authenticated request to `/admin/dashboard` succeeded — all under the
`/admin` basePath. The exact same steps work identically once deployed.

## What's still a real gap

- No in-app "change my password while logged in" settings page yet —
  only the logged-out forgot-password flow exists. A low-effort
  follow-up (`admin_users` already has everything needed; the LMS's
  student settings page is a ready template to copy).
- No email verification step for a newly seeded account — the seed
  endpoint trusts whatever email is given. Acceptable for a one-time,
  secret-gated bootstrap of the single first account, less so if this
  endpoint is ever reused to create several accounts; rotate/remove
  `SEED_SECRET` after first use.
