# Learn with Shahid — Progress

**Current phase:** Phase 2 — Database & authentication. **Core auth/RBAC skeleton built, tested, and verified locally against MySQL. Real deployment blocked on one thing only you can do (below) — everything I could build without it is done.**

## Completed

### Phase 1 (architecture, approved)
Full audit, architecture proposal, database/security/payment/business-model design, 15-phase plan with V1/V2 split — see `docs/lms-architecture-audit.md` through `docs/LMS_PRE_PHASE_2_REVIEW.md`. All decisions locked in `docs/LMS_DECISIONS.md` (36 entries across two addenda, including the mid-review Hostinger hosting update and the MySQL database-engine change below).

### Phase 2 (this round)
- **New workspace app**: `apps/learn` (Next.js 16 + TypeScript + Tailwind, reusing the main site's brand tokens), added to the pnpm workspace without touching the existing Astro site's build — re-verified: the marketing site still builds 58 pages correctly.
- **Full 48-table database schema** as Drizzle ORM models, matching `docs/lms-database.md`'s design. Migration generated and run cleanly against a local MySQL instance.
- **Authentication**: register/login/logout/verify-email/reset-password, all real, all tested — scrypt password hashing, server-side sessions, rate limiting, generic no-enumeration responses, email verification and password-reset token flows (email itself goes through a dev-console transport until a real provider is chosen — `src/lib/email.ts`).
- **RBAC**: database-backed permissions, `requirePermission()`/`requireAnyRole()` helpers, `/dashboard` and `/admin` route gating (admin gives a 404, not a 403, to a non-admin — doesn't confirm the panel exists to an account that isn't one).
- **IDOR-safe query pattern** built and tested: every scoped lookup filters by `(user_id AND id)`, demonstrated with a Student-A-cannot-read-Student-B test.
- **Price resolution** (`src/lib/pricing.ts`): server-side only, by construction — the function has no client-amount parameter to manipulate. Tested against the actual PKR 800 enrollment price.
- **`audit_logs` made insert-only at the database level** (not just documented) — via two MySQL database users (see below), with an automated test proving the restriction actually blocks UPDATE/DELETE/TRUNCATE.
- **18/18 automated tests passing** against a real local MySQL database, plus a full manual end-to-end smoke test of the running app (register → login → dashboard access → admin RBAC gate → logout → access revoked → rate limiting kicks in after repeated bad logins) — all verified working, not just written.
- **Seed data**: 5 fake test accounts (super_admin/admin/instructor/2 students, `.test` TLD, never real), the Learn with Shahid Enrollment product at PKR 800, a sample course, and all 18 roadmap stages.
- **Deploy workflow written** (`.github/workflows/deploy-lms.yml`) — separate from the marketing site's, builds and ships to the `learn.shahidiqbal.com` subdomain you already created in hPanel.

### Mid-round change: PostgreSQL → MySQL
You asked why an external Postgres provider was needed at all, given you already have Hostinger hosting and didn't want a mobile-app-flavored service like Supabase. Real answer: Supabase isn't mobile-specific (it's just hosted Postgres with optional extras) — but you're right that Hostinger's included MySQL means no external database account is needed at all. The entire schema, ORM layer, migrations, seed script, and test suite were **rewritten from Postgres to MySQL and re-verified from scratch** (not just edited) — same 18 tests, same behavior, all passing against real local MySQL.

One real trade-off came out of this, disclosed rather than hidden: MySQL's privilege model can't `REVOKE` a privilege from one table if it was granted at the database level, the way Postgres can. Making `audit_logs` genuinely insert-only on MySQL requires **two database users** — a full-privilege one for migrations, and a narrower one (provisioned automatically by `apps/learn/src/db/apply-grants.ts`) that the app actually runs as. Setting up that second user's grants needs the admin user to have `GRANT OPTION`, which is **not yet confirmed available on your Hostinger plan** — see "Next" below.

## What I could not do myself (not a permission gate — a capability one)

I have no browser and no external account credentials in this sandbox. One thing blocks turning this from "built and tested locally" into "actually deployed":

1. **Hostinger's hPanel "Setup Node.js App" wizard**, run once against the subdomain you already created — sets the startup file to `server.js` and confirms the Node.js version available. While there, also check whether your MySQL admin user has `GRANT OPTION` (needed for the two-user `audit_logs` protection above to work as designed — see `apps/learn/README.md`'s "Two database users" section for exactly what to check and the fallback if it isn't available).

Full instructions, plus the exact GitHub secrets to add (`LMS_DATABASE_ADMIN_URL`, `LMS_DATABASE_URL`, `LMS_SESSION_SECRET`, `LMS_APP_URL`) and an honest note about the untested Passenger-restart-file convention the deploy workflow uses, are in `apps/learn/README.md`.

Until that's done, `deploy-lms.yml` will run on every push to `apps/learn/**` and fail at the build step — expected (the app's own env validation refusing to start without real database secrets), harmless (touches nothing on the live marketing site), and not something to work around by faking a value.

## Next

1. You: complete the hPanel Node.js App setup and check the `GRANT OPTION` question (`apps/learn/README.md` has the exact steps), then add the four GitHub secrets.
2. Me, once those secrets exist: confirm the first real deploy succeeds, verify the restart mechanism actually works, then continue building Phase 3 (admin dashboard content) per `LMS_IMPLEMENTATION_PLAN.md` — no new infrastructure needed for Phase 3–6.
3. Payment provider and transactional email provider choices remain open, needed by Phase 7, not blocking anything before it.

## Blocked

Real deployment is blocked on the item above. Nothing else is blocked — Phase 3 onward (admin dashboard, student dashboard, courses/lessons, membership logic) can continue against the local dev database regardless.

## Not started

Phases 3–15 in full, per `LMS_IMPLEMENTATION_PLAN.md`.
