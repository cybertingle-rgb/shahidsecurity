# Learn with Shahid — Pre-Phase-2 Review Package

**Status:** review package. This is the single document to read before deciding whether to say "START PHASE 2." It summarizes the Phase 1 proposal documents into one place and adds what wasn't spelled out yet: infrastructure cost shape, security/migration risk, and the concrete list of accounts, secrets, DNS records, and third-party services Phase 2 will need. **Nothing here has been provisioned.** Saying "START PHASE 2" approves *starting* the work in `LMS_IMPLEMENTATION_PLAN.md` Phase 2 — it does not by itself hand over payment credentials or flip anything into production; those stay separately gated per that plan.

## 1. Architecture diagram

**Updated 2026-09-27**: the LMS app now runs on the same Hostinger account as the existing site (its own subdomain and directory, already created), rather than a separately-provisioned host — see `LMS_DECISIONS.md`'s addendum (#31–33).

```
                     One Hostinger account (u397210942)
                     ┌──────────────────────────────────────────────────────────────────┐
                     │                                                                    │
                     │  shahidiqbal.com — Astro static site — public_html/               │
                     │  ┌─────────────────────────────────────────┐                      │
                     │  │ /            /services      /blog       │                      │
                     │  │ /about       /case-studies  /contact    │                      │
                     │  │                                         │                      │
                     │  │ NEW, static, indexable:                 │                      │
                     │  │  /learn            /learn/pricing       │                      │
                     │  │  /learn/roadmap     /learn/faq          │                      │
                     │  │  /learn/courses[/slug]                  │                      │
                     │  └───────────────┬─────────────────────────┘                      │
                     │                  │ build-time fetch (course/marketing data)       │
                     │                  │ client-side fetch (live price, seats)          │
                     │                  │ "Enroll" / "Login" links (no shared session)   │
                     │                  ▼                                                │
                     │  learn.shahidiqbal.com — Next.js app — public_html/learn/         │
                     │  (hPanel "Setup Node.js App" — separate process, separate code)   │
                     │  ┌───────────────────────────────────────────────────────────┐   │
                     │  │  Public: /login /register /verify-email /reset-password   │   │
                     │  │  Student: /dashboard /my-courses /course/[slug] /lesson    │   │
                     │  │           /progress /community /profile /settings         │   │
                     │  │  Admin:  /admin/* (RBAC-gated, server-side, every request) │   │
                     │  │  Public read-only API: GET /api/public/courses            │   │
                     │  └───────────────┬───────────────────────────┬────────────────┘   │
                     │                  │                            │                    │
                     └──────────────────┼────────────────────────────┼────────────────────┘
                                        │                            │
                                        ▼                            ▼
                     External managed PostgreSQL          Payment provider(s)
                     (Neon/Supabase/other — TBD,           (one online provider — Safepay,
                      staging + production instances)      pending comparison — + manual
                      users, roles, courses,                bank-transfer, per lms-payments.md)
                      enrollments, orders,
                      payments, communities,                Transactional email provider
                      audit_logs, etc.                       (Resend/Postmark/SES — TBD)
                      — see lms-database.md
```

External platforms the community feature points to (Discord/Facebook/Telegram) are **not integrated systems** in V1 — they're admin-entered URLs (`communities.url`) shown to eligible students. No API calls to those platforms happen in V1.

Hostinger hosts the app **process**; it does not host the **database** (Hostinger shared plans offer MySQL, not Postgres) — that's still an external managed service, same as it would have been under the original Railway/Render plan.

## 2. Database architecture (summary — full detail in `lms-database.md`)

PostgreSQL, one schema, six domains: Identity & RBAC, Courses & Content, Enrollment & Progress, Certificates, Commerce (products/prices/orders/payments/coupons), Memberships & Communities, plus Live Classes/Resources/Support and a Platform group (`audit_logs`, `notifications`, `settings`). Two design choices carry the most weight for the decisions you just approved:

- **`products` + `prices`** is the mechanism behind "PKR 800 must not be hardcoded" and "supports future currencies" (`LMS_DECISIONS.md` #8, #15) — the enrollment membership is a normal row, not a special case in code.
- **`audit_logs` is insert-only** for the application's database role — no ordinary admin action can delete its own trail.

Phase 2 creates the **full schema**, including V2-only tables (certificates, coupons, live classes), per the note at the bottom of `LMS_IMPLEMENTATION_PLAN.md` — one migration now instead of a second one when V2 starts, with zero V2 application code attached in V1.

## 3. Authentication architecture (summary — full detail in `lms-security.md`)

Server-side sessions (opaque token in an `HttpOnly`/`Secure`/`SameSite=Lax` cookie, backed by a `sessions` table row), argon2id password hashing, required email verification before any paid action, single-use time-limited password-reset tokens, rate limiting on login/register/reset endpoints, and RBAC permission checks performed server-side on every request — never inferred from a client-readable role claim, cookie value, or local storage flag (the brief's explicit rule, restated in `LMS_DECISIONS.md` #16–17). MFA for admin/super-admin is flagged for Phase 2/3, not deferred indefinitely.

## 4. Payment architecture (summary — full detail in `lms-payments.md`)

A `PaymentProvider` TypeScript interface (`createPayment`/`verifyPayment`/`refundPayment`/`getPaymentStatus`/`handleWebhook`) that a manual-bank-transfer implementation and any online provider both satisfy — checkout/order/enrollment code never knows which concrete provider it's talking to. V1 integrates exactly one online provider (comparison pending — Safepay is the current lead) plus manual transfer with admin approval. No provider is assumed to have a working merchant account or API access yet (`LMS_DECISIONS.md` #14) — see §7 below for what has to happen before that integration can start.

## 5. Deployment architecture (summary — full detail in `lms-deployment.md`)

Three environments: local (Docker/local Postgres, fake seed data), staging (full app + its own external Postgres database, run the same way production will — as a Hostinger Node.js App — used to test every migration and the payment sandbox before production sees either), and production (`learn.shahidiqbal.com`, already mapped in hPanel to `public_html/learn`). Every schema change is a reviewed, version-controlled migration, tested on staging with a tested rollback before it ever runs against production; destructive changes need a separate explicit approval even after passing staging. The existing site's deploy pipeline (GitHub Actions → rsync to Hostinger) is completely untouched — the only overlap is (a) the small number of new static `/learn/*` pages, which go through that same existing pipeline like any other page, and (b) sharing the same Hostinger account's overall resource ceiling with the LMS app, which is a low-risk, monitored consideration rather than a shared codebase or deploy pipeline (see §8).

## 6. V1 scope / V2 roadmap

- V1 scope, in full: `LMS_V1_SCOPE.md`.
- V2 (documented, not implemented): certificates, coupons, course bundles, live classes, advanced analytics, automated email campaigns, additional payment providers, subscriptions, mentorship, corporate training, advanced community automation — schema-ready today, feature work scheduled after V1 ships and is validated with real students (`LMS_IMPLEMENTATION_PLAN.md`'s "V2" section).

## 7. Estimated infrastructure requirements

Given at a shape/order-of-magnitude level, not a quote — real pricing is a business decision to make with current numbers in hand, not something to assume here. **Updated for the Hostinger-hosted app decision:**

| Item | Shape | Notes |
| --- | --- | --- |
| App hosting (Next.js, persistent process) | **Already covered by your existing Hostinger plan** — no new hosting cost for the app itself, pending confirmation of Node.js version/resource limits in hPanel | This is the main cost saving versus the original Railway/Render plan |
| Managed Postgres | A small **external** managed instance, staging + production = two instances/databases | Automated backups should be a non-negotiable feature of whichever provider is chosen (Neon/Supabase/other), not an add-on — this is now the only *new* recurring infra cost besides email/payments |
| Object/file storage | Small (course thumbnails, PDFs, receipt uploads, assignment submissions) | Can live on Hostinger's own disk (within the app's directory, outside anything web-executable — see `lms-security.md`'s upload rules) or a cheap external S3-compatible bucket if disk quota is tight |
| Video hosting | Likely **not** self-hosted storage in V1 — YouTube-unlisted or Vimeo per `lms-database.md`'s `lesson_video_sources` abstraction | Keeps bandwidth cost off Hostinger's own plan entirely in V1 |
| Transactional email | Pay-as-you-go tier of a dedicated provider (Resend/Postmark/SES) | Verification/receipt/reset volume only in V1 — not marketing email |
| DNS/CDN | Free tier is sufficient (e.g. Cloudflare in front of the `learn` subdomain) | Also the cheapest way to get the `CF-IPCountry` header `lms-business-model.md`'s country-pricing logic wants — requires pointing the subdomain's DNS through Cloudflare instead of directly at Hostinger, worth weighing against keeping the existing hPanel-created A/CNAME record as-is |
| Payment provider fees | Percentage-per-transaction, provider-dependent | Compare directly against alternatives before choosing, per `lms-payments.md` |

**Net read:** V1's hosting footprint is now even smaller than originally estimated — the app itself adds no new hosting bill, leaving external Postgres, email, and payment fees as the only new recurring costs. The trade-off is Hostinger's shared-hosting resource ceiling instead of a dedicated app host's — acceptable at V1 scale, worth re-evaluating if traffic grows enough to matter (§8).

## 8. Security risks (beyond what `lms-security.md` already commits to controlling)

- **New attack surface, full stop.** The existing site has no login and nothing to steal; the LMS introduces accounts, sessions, payment data, and an admin surface — a fundamentally larger risk surface than anything shahidiqbal.com carries today. This isn't a reason not to build it, but it's the honest baseline: Phase 12's full security audit before Phase 15's launch is load-bearing, not a formality.
- **Payment-adjacent risk even before real credentials exist.** Sandbox/test integration in Phase 7 still touches real code paths (webhook parsing, idempotency, order state machine) that must be correct before any real money flows — a bug here is a financial/trust incident, not just a functional bug.
- **Cross-domain trust boundary.** The static site and the LMS app share a brand but not a session; a misconfigured CORS/CSP rule on either side (the marketing site's strict `security.csp`, or a new `connect-src` allowance for the LMS API) is the most likely place a subtle security regression could slip in during Phase 10 — the SEO regression checklist in `lms-deployment.md` overlaps with this but doesn't replace a security-specific check.
- **Admin account compromise is the highest-value target.** RBAC and audit logging (`lms-security.md`) reduce blast radius, but admin MFA lands late (flagged Phase 2/3) relative to when the admin panel itself exists (Phase 3) — worth treating MFA as a near-immediate follow-up once Phase 3 ships, not a someday item.
- **Third-party dependency risk.** A payment aggregator, an email provider, and an auth library are all new supply-chain trust relationships the existing site doesn't have; routine dependency auditing (already planned per `lms-security.md`) is what keeps this from being a silent risk.
- **Shared-hosting-specific risk (new, from the Hostinger decision).** Running the LMS on the same account as the marketing site means a compromise of one hosting account's credentials threatens both applications, even though their code and directories are separate — this wasn't a shared risk under the original separate-Railway/Render plan. Mitigation is the same account hygiene that already protects the existing site (strong credentials, SSH key auth, no shared reuse with any other service), just now protecting two applications instead of one.

## 9. Migration risks

- **This is a new build, not a migration of existing data** — there's no existing LMS database to migrate *from*, which removes the highest-risk category of migration work (no risk of corrupting or losing real student/payment history, because none exists yet).
- **Schema risk is forward-looking**: Phase 2 creates the full schema including V2 tables (§2), so the main future migration risk is *changing* an early design decision (e.g. a column type) after real data exists in it, not adding new V2 tables later. Getting `lms-database.md`'s core tables (`users`, `products`, `prices`, `orders`, `payments`) right in Phase 2 review matters more than usual because they're hardest to change once populated.
- **Staging-first is the mitigation, not a formality.** Every migration (`lms-deployment.md`) runs and rolls back on staging before touching production — this is the concrete control against the generic "a migration corrupts production data" risk category.
- **No migration risk to the existing site.** Nothing in this plan alters `shahidiqbal.com`'s content collections, schema, or deploy pipeline — the only touch point is additive static pages, which is a normal content change, not a migration.

## 10. Required external accounts (to be opened only when Phase 2 actually starts, not now)

- ~~Hosting platform account (Railway or Render)~~ — **no longer needed**; the app hosts on your existing Hostinger account (`learn.shahidiqbal.com`, already created)
- External managed Postgres provider account (Neon, Supabase, or a database-only Railway/Render/Aiven/ElephantSQL plan — final choice needed before Phase 2 provisioning)
- Cloudflare account (recommended, free tier, for the `learn` subdomain — enables country detection and basic DDoS/CDN protection; requires deciding whether to move the subdomain's DNS through Cloudflare instead of the hPanel-created record, see §7)
- Transactional email provider account (Resend, Postmark, or SES — final choice needed before Phase 2)
- Payment provider merchant account(s) — **separately gated, own timeline**: whichever of Safepay/JazzCash/Easypaisa is chosen requires its own business registration/KYC process before any API credentials exist (`lms-payments.md`) — this application can be started independently of code work, since its approval timeline is outside this project's control
- GitHub (or equivalent) repository for the new LMS codebase, separate from the existing site's repository (deploy target changes to Hostinger's Node.js App rather than Railway/Render, but a separate repo is still recommended for the same separation-of-concerns reasons as before)

## 11. Required environment variables (Phase 2 baseline — grows as later phases add providers)

| Variable | Purpose | Where it lives |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | Hosting platform secret store, never committed |
| `SESSION_SECRET` | Session/cookie signing | Hosting platform secret store |
| `EMAIL_PROVIDER_API_KEY` | Transactional email sending | Hosting platform secret store |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL for links in emails, redirects | Build/runtime config, not secret |
| `PAYMENT_PROVIDER_PUBLIC_KEY` | Client-side payment widget (if the chosen provider needs one) | Safe to expose client-side, same pattern as the existing site's `PUBLIC_TURNSTILE_SITE_KEY` |
| `PAYMENT_PROVIDER_SECRET_KEY` | Server-side payment API calls | Hosting platform secret store — **never** sent to the browser |
| `PAYMENT_WEBHOOK_SIGNING_SECRET` | Validating incoming webhook signatures | Hosting platform secret store |
| `ADMIN_ALERT_EMAIL` | Where operational/security alerts go | Config, not secret |

No real values exist for any of these yet; this is the list Phase 2 will need populated in staging first, with production values added only at the point each becomes necessary (payment secrets specifically wait for Phase 7).

## 12. Required DNS changes

- **None required for the app itself.** The `learn.shahidiqbal.com` subdomain already exists (created in hPanel, mapped to `public_html/learn`), and hPanel-created subdomains provision their own DNS record automatically on the same hosting account — no manual record needed for the app to be reachable.
- **Optional**: if Cloudflare is adopted in front of the subdomain (recommended in §7/§10 for country detection and basic DDoS/CDN protection), that's a DNS *target* change for that one subdomain's record — proxying it through Cloudflare instead of resolving directly to Hostinger — decided at Phase 2, not required to start.
- **No changes to any existing record** (root domain, `www`, mail records, the existing site's hosting) are needed or proposed, either way.

## 13. Required third-party services

- ~~Hosting platform (Railway or Render)~~ — **replaced by your existing Hostinger account**, already set up with the `learn` subdomain
- External managed Postgres provider (Neon, Supabase, or similar — final choice pending)
- Transactional email provider (Resend, Postmark, or SES)
- One payment provider for online payments (Safepay lead candidate, pending comparison) + manual bank transfer (no third party required for that path)
- Cloudflare (recommended, free tier) for the `learn` subdomain
- Object storage for uploads (thumbnails, PDFs, receipts) — can stay on Hostinger's own disk (outside anything web-executable) or move to a cheap S3-compatible add-on if disk quota is tight
- Video hosting (YouTube-unlisted or Vimeo) — no new storage-cost dependency, but a real account/channel decision if not already in place

## 14. What this package is not

Not a cost quote (real numbers need real account sign-ups to get), not a final choice of hosting platform or payment provider (both still need your input — see the four open decisions below), and not an implementation start. It's the complete "here's what saying yes actually commits to" picture the brief asked for before Phase 2 begins.

## 15. Still open — needed before or during Phase 2, not blocking this review

1. **hPanel verification** (not a choice, a check): confirm the Node.js version(s) hPanel's "Setup Node.js App" offers on your plan, the app's memory/CPU limits, and that outbound HTTPS isn't blocked — needed before Phase 2 provisioning, doable now.
2. External managed Postgres provider choice (Neon / Supabase / other) — needed before Phase 2 provisioning.
3. Which payment provider(s) to pursue merchant onboarding with first (Safepay alone, or also JazzCash/Easypaisa in parallel) — this can start now, independently of code, since it has its own approval timeline.
4. Transactional email provider choice (Resend / Postmark / SES).
5. Final confirmation of the `/learn/*` route list in `lms-architecture.md` §3 (already matches your approved list in `LMS_DECISIONS.md` #5 — flagged here only so Phase 10 doesn't need to re-ask).

None of these five block saying "START PHASE 2" as a decision, but **#1 and #2 need answers before Phase 2's actual provisioning step can run**, since Phase 2 is database schema + authentication. #3 and #4 are Phase 7 concerns and can be finalized in parallel with Phases 2–6.
