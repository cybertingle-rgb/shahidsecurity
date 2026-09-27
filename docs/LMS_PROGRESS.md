# Learn with Shahid — Progress

**Current phase:** Phase 2 — Database & authentication. **Core auth/RBAC skeleton built, tested, and verified locally. Real deployment blocked on two things only you can do (below) — everything I could build without them is done.**

## Completed

### Phase 1 (architecture, approved)
Full audit, architecture proposal, database/security/payment/business-model design, 15-phase plan with V1/V2 split — see `docs/lms-architecture-audit.md` through `docs/LMS_PRE_PHASE_2_REVIEW.md`. All decisions locked in `docs/LMS_DECISIONS.md` (33 entries, including the mid-review Hostinger hosting update).

### Phase 2 (this round)
- **New workspace app**: `apps/learn` (Next.js 16 + TypeScript + Tailwind, reusing the main site's brand tokens), added to the pnpm workspace without touching the existing Astro site's build — re-verified: the marketing site still builds 58 pages correctly.
- **Full 48-table database schema** as Drizzle ORM models, matching `docs/lms-database.md` exactly. Migration generated and run cleanly against a local Postgres instance.
- **Authentication**: register/login/logout/verify-email/reset-password, all real, all tested — scrypt password hashing, server-side sessions, rate limiting, generic no-enumeration responses, email verification and password-reset token flows (email itself goes through a dev-console transport until a real provider is chosen — `src/lib/email.ts`).
- **RBAC**: database-backed permissions, `requirePermission()`/`requireAnyRole()` helpers, `/dashboard` and `/admin` route gating (admin gives a 404, not a 403, to a non-admin — doesn't confirm the panel exists to an account that isn't one).
- **IDOR-safe query pattern** built and tested: every scoped lookup filters by `(user_id AND id)`, demonstrated with a Student-A-cannot-read-Student-B test.
- **Price resolution** (`src/lib/pricing.ts`): server-side only, by construction — the function has no client-amount parameter to manipulate. Tested against the actual PKR 800 enrollment price.
- **audit_logs made insert-only at the database level** (not just documented) — the app's own database role has UPDATE/DELETE/TRUNCATE revoked, and an automated test proves the revocation actually blocks those statements.
- **18/18 automated tests passing** against a real local Postgres database, plus a full manual end-to-end smoke test of the running app (register → login → dashboard access → admin RBAC gate → logout → access revoked → rate limiting kicks in after repeated bad logins) — all verified working, not just written.
- **Seed data**: 5 fake test accounts (super_admin/admin/instructor/2 students, `.test` TLD, never real), the Learn with Shahid Enrollment product at PKR 800, a sample course, and all 18 roadmap stages.
- **Deploy workflow written** (`.github/workflows/deploy-lms.yml`) — separate from the marketing site's, builds and ships to the `learn.shahidiqbal.com` subdomain you already created in hPanel.

## What I could not do myself (not a permission gate — a capability one)

I have no browser and no external account credentials in this sandbox. Two things block turning this from "built and tested locally" into "actually deployed":

1. **An external managed Postgres account** (Neon/Supabase/similar) — I can't sign up for one. Once you have a connection string, it becomes the `LMS_DATABASE_URL` GitHub secret.
2. **Hostinger's hPanel "Setup Node.js App" wizard**, run once against the subdomain you already created — sets the startup file to `server.js` and confirms the Node.js version available.

Full instructions for both, plus the exact secrets to add and an honest note about the untested Passenger-restart-file convention the deploy workflow uses, are in `apps/learn/README.md`.

Until those two things happen, `deploy-lms.yml` will run on every push to `apps/learn/**` and fail at the build step — expected (the app's own env validation refusing to start without a real database), harmless (touches nothing on the live marketing site), and not something to work around by faking a value.

## Next

1. You: create the external Postgres database and complete the hPanel Node.js App setup (`apps/learn/README.md` has the exact steps).
2. Me, once those secrets exist: confirm the first real deploy succeeds, verify the restart mechanism actually works, then continue building Phase 3 (admin dashboard content) per `LMS_IMPLEMENTATION_PLAN.md` — no new infrastructure needed for Phase 3–6.
3. Payment provider and transactional email provider choices remain open, needed by Phase 7, not blocking anything before it.

## Blocked

Real deployment is blocked on the two items above. Nothing else is blocked — Phase 3 onward (admin dashboard, student dashboard, courses/lessons, membership logic) can continue against the local dev database regardless.

## Not started

Phases 3–15 in full, per `LMS_IMPLEMENTATION_PLAN.md`.
