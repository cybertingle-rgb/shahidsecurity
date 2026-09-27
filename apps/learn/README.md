# Learn with Shahid — application

Phase 2 (database + authentication) of `docs/LMS_IMPLEMENTATION_PLAN.md`. Next.js 16 (App Router) + PostgreSQL (Drizzle ORM), deployed to the `learn.shahidiqbal.com` subdomain via Hostinger's "Setup Node.js App" feature, per `docs/LMS_DECISIONS.md`'s hosting addendum. Nothing here is live yet — see "What still needs a human" below.

## What's built and verified locally (real, tested, not just written)

- **Full database schema** (48 tables, every domain from `docs/lms-database.md`) as Drizzle ORM models — `src/db/schema/`.
- **Authentication**: register, login, logout, email verification, password reset — `src/app/api/auth/*`, `src/lib/auth/*`. Scrypt password hashing (Node's built-in, no native binary — see the comment in `src/lib/auth/password.ts` for why, given the shared-hosting deploy target), server-side sessions (`HttpOnly`/`Secure`/`SameSite=Lax` cookie, hashed token in the database), rate limiting on login/register/reset, generic responses that never leak whether an email is registered.
- **RBAC**: permissions stored in the database (`src/lib/rbac.ts`), checked server-side on every request via `requirePermission()`/`requireAnyRole()` — never inferred from a client claim. `/dashboard/*` and `/admin/*` are gated in their Server Component layouts (not `middleware.ts` — session validation needs the `pg` driver, which needs the Node.js runtime, not the Edge runtime `middleware.ts` traditionally runs under).
- **IDOR-safe query pattern** demonstrated and tested: scope every lookup by `(user_id AND id)`, never `id` alone.
- **Price resolution** (`src/lib/pricing.ts`): the PKR 800 enrollment price, and every future price, is read from the `prices` table server-side — the function has no parameter for a client-supplied amount at all.
- **audit_logs is insert-only at the database level**, not just by convention — `src/db/apply-grants.ts` revokes UPDATE/DELETE/TRUNCATE from the app's own database role, verified by an automated test that the revocation actually blocks those statements.
- **18 automated tests, all passing** against a real local Postgres instance (`pnpm test`): password hashing round-trip, RBAC grant/deny (including "a student cannot reach an admin action"), the Student-A-cannot-read-Student-B IDOR test, price resolution correctness, and the audit_logs grant enforcement.
- **`next build` succeeds**, all V1 route shells (`/`, `/login`, `/register`, `/dashboard`, `/admin`) render and were manually smoke-tested end-to-end against a running instance: register → login → session-gated dashboard access → RBAC-gated admin (404 for a non-admin, 200 for an admin) → logout → access revoked.
- **The existing marketing site's own build was re-verified** after adding this workspace package — 58 pages, unaffected.

## What still needs a human — I could not do these myself

I do not have a browser, Hostinger login, or any external account credentials in this sandbox. These are one-time actions, not permission requests — the code above works today against a local database; these are what turn it into a *deployed* app in the way `docs/LMS_DECISIONS.md`'s hosting addendum describes.

1. **An external managed Postgres database** (Neon, Supabase, or similar — `docs/LMS_PRE_PHASE_2_REVIEW.md` §15). I can't sign up for one. Once you have a connection string, add it as the `LMS_DATABASE_URL` GitHub Actions secret.
2. **hPanel's "Setup Node.js App" wizard**, run once against the `learn.shahidiqbal.com` subdomain you already created: set the application root to that subdomain's directory, the startup file to `server.js` (the file `next build`'s `output: 'standalone'` produces), and confirm which Node.js version the wizard offers (needs 20+; the app is built and tested against 22).
3. **Confirm the app restart mechanism.** `.github/workflows/deploy-lms.yml`'s last step touches `tmp/restart.txt` in the app directory — the standard Phusion Passenger convention, which is what cPanel/Hostinger's Node.js Selector is built on. I have no way to verify this actually triggers a restart on your specific plan without hPanel access; if it doesn't, the workaround is clicking "Restart" in hPanel after each deploy until we find the real hook (or you can tell me what hPanel's UI shows and I'll adjust the workflow).
4. **Four more GitHub Actions secrets**, once you have the values: `LMS_SESSION_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `LMS_APP_URL` (`https://learn.shahidiqbal.com`), and optionally `DEPLOY_LMS_PATH` if the subdomain's directory ever changes from what's hardcoded in the workflow. `DEPLOY_SSH_KEY`/`DEPLOY_HOST`/`DEPLOY_PORT`/`DEPLOY_USER` are reused from the existing marketing-site deploy — no new secret needed for those.

Until #1 and #2 are done, `.github/workflows/deploy-lms.yml` will run on every push to `apps/learn/**` and fail at the build step (missing `LMS_DATABASE_URL`) — that's the env validation in `src/lib/env.ts` working as designed (fail loud, not silently), not a bug. It's safe to leave failing; it touches nothing on the live marketing site either way.

## Local development

```bash
cd apps/learn
cp .env.example .env   # then edit DATABASE_URL/SESSION_SECRET if needed
pnpm install            # from the repo root, once, covers this workspace too
pnpm db:migrate
pnpm db:apply-grants
pnpm db:seed             # fake accounts — see src/db/seed.ts for the list; dev password DevPassword123!
pnpm dev
```

Running the test suite needs a second, separate database (never point it at dev):

```bash
createdb learn_with_shahid_test   # or via your Postgres client of choice
DATABASE_URL=postgres://.../learn_with_shahid_test pnpm db:migrate
DATABASE_URL=postgres://.../learn_with_shahid_test pnpm db:apply-grants
TEST_DATABASE_URL=postgres://.../learn_with_shahid_test \
TEST_DB_ADMIN_URL=postgres://<a-superuser>@.../learn_with_shahid_test \
  pnpm test
```

`TEST_DB_ADMIN_URL` is a superuser connection used only by the test harness to reset all tables (including `audit_logs`) between tests — the app's own role deliberately can't do that (see above), so test cleanup needs a separate, more-privileged connection. Never point this at anything but a local/throwaway test database.

## Not built yet (by design — see `docs/LMS_V1_SCOPE.md` and `LMS_IMPLEMENTATION_PLAN.md`)

Admin dashboard content (Phase 3), student dashboard content beyond the shell (Phase 4), courses/lessons/quizzes (Phase 5), the actual enrollment purchase flow (Phase 6), payments (Phase 7), communities UI (Phase 8), certificates (V2), and everything else the phased plan lists. This README will be updated as each phase lands.
