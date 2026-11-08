# Subdomain Retirement Checklist — Full Consolidation Project

**Status:** plan only. Per the brief's explicit instruction and this
project's Strict Development Rules, **neither subdomain is retired until
you explicitly approve it**, and only after every item below is verified
in production, not staging. Nothing on this checklist has been actioned.

## 0. Gate — do not start this checklist until

- [ ] The gateway has been live on `shahidiqbal.com` for a meaningful
      period with no unresolved issues (how long is your call, not a fixed
      number here).
- [ ] Every item in §1–§9 below is checked **in production**.
- [ ] You have explicitly said to proceed.

"Retiring" here means restricting `admin.shahidiqbal.com`/
`learn.shahidiqbal.com` so they no longer accept public traffic directly
(`UNIFIED_ARCHITECTURE.md` §7's hardening note) — **not** deleting either
website, database, or deployment. Hard deletion is a separate, further
decision this checklist does not cover and this project will not take
without a separate, explicit instruction to do so.

## 1. New routes work correctly

- [ ] `/`, `/admin/*`, `/learn/*` all verified in production (not just
      staging) — login, a real dashboard page, a real course page.
- [ ] Every route in `URL_REDIRECT_MAP.md`'s scope spot-checked, not just
      the examples listed there.

## 2. Data and auth verified

- [ ] Existing admin accounts can log in and reach `/admin/dashboard`
      through the gateway.
- [ ] Existing student accounts can log in and reach `/learn/dashboard`
      through the gateway.
- [ ] A real enrollment, a real payment record, and a real course all
      still show correctly through the new URLs.

## 3. Uploaded media works

- [ ] A course thumbnail and an admin-uploaded media file (both served
      from `media`'s DB blob storage, `PLATFORM_AUDIT.md` §5) load
      correctly through `/admin/*`.

## 4. External integrations work

- [ ] Google OAuth login (if configured) succeeds through the new
      `/admin`/`/learn` URLs — requires the new redirect URI to have been
      added at Google's console first (`URL_REDIRECT_MAP.md` §4) and kept
      alongside the old one until this step passes.
- [ ] The three existing cross-app bridges (`PLATFORM_AUDIT.md`'s
      integration list: leads-intake, ai-questions-intake, Luna chat) still
      work — none of them depend on the public URL changing, but verify
      rather than assume.
- [ ] Luna's own cross-origin call from the Astro site to
      `learn.shahidiqbal.com/api/luna/chat` — confirm whether this should
      be re-pointed at `shahidiqbal.com/learn/api/luna/chat` once that's
      the public URL, or left as-is (an internal call, not a user-facing
      one) — not yet decided.

## 5. Redirects work

- [ ] `admin.shahidiqbal.com/<path>` 301s to `shahidiqbal.com/admin/<path>`
      for a representative sample of real paths, not just the root.
- [ ] `learn.shahidiqbal.com/<path>` 301s to `shahidiqbal.com/learn/<path>`
      likewise.
- [ ] No redirect loop (gateway → old subdomain → gateway) — test
      directly, don't assume from reading the config.

## 6. Production monitoring is healthy

- [ ] No elevated error rate on the gateway or on admin/learn following
      cutover, over a real observation window (your call on how long).

## 7. DNS, SSL, hosting configuration

- [ ] Confirm whether `admin.shahidiqbal.com`/`learn.shahidiqbal.com`'s
      DNS records need to change at all for the "no longer public"
      restriction (likely not — the restriction is at the application/
      Hostinger-firewall level, not DNS, per `SECURITY_REVIEW.md` §14's
      hardening note) — verify in hPanel before assuming.
- [ ] SSL certificates for both subdomains: confirmed still valid/auto-
      renewing even if public traffic to them drops — do not let them
      lapse while still needed for the gateway's own internal HTTPS calls
      to them.

## 8. Webhook / OAuth callback / email-link audit

- [ ] OAuth callback URLs (§4) — the *old* one can be removed from
      Google's console only after this entire checklist passes, not
      before.
- [ ] Any payment gateway webhook callback URL, if one is found to exist
      (`PLATFORM_AUDIT.md` §10.4 — still unconfirmed as of this writing) —
      same add-before-remove treatment.
- [ ] Any email template with a hardcoded old-subdomain link (both apps'
      `authEmailHtml()` per the recent color-sync commit, and any
      password-reset/verification email) — audited and updated to the new
      URL.

## 9. External API references

- [ ] Search Console / GA4 property configuration reconciled
      (`URL_REDIRECT_MAP.md` §4 — needs your input on account ownership).
- [ ] Any other external reference to the old subdomains (documentation,
      marketing material, third-party integrations) — not fully
      enumerable from the codebase alone; flagged for your own review
      rather than guessed at.

## After every box above is checked, in production

Only then: restrict public access to `admin.shahidiqbal.com` and
`learn.shahidiqbal.com` (e.g. Hostinger-level IP allowlisting to the
gateway's own outbound address, or an application-level shared secret
header the gateway adds and each app requires — not yet decided which).
Keep both websites, both databases, and both deployments intact and
available for rollback — this checklist retires *public reachability*,
not the applications themselves, and even that only with your explicit
go-ahead at the time.
