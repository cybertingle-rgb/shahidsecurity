# Learn with Shahid — application

Phase 2 (database + authentication) of `docs/LMS_IMPLEMENTATION_PLAN.md`. Next.js 16 (App Router) + MySQL (Drizzle ORM), deployed to the `learn.shahidiqbal.com` subdomain via Hostinger's "Setup Node.js App" feature, per `docs/LMS_DECISIONS.md`'s hosting addenda. Nothing here is live yet — see "What still needs a human" below.

**Updated 2026-09-27**: the database engine changed from PostgreSQL (on an external provider) to MySQL, so everything runs on your existing Hostinger account with no new company/account for the database either. Everything below reflects that rewrite — fully re-migrated and re-tested against real MySQL, not just edited.

## What's built and verified locally (real, tested, not just written)

- **Full database schema** (48 tables, every domain from `docs/lms-database.md`) as Drizzle ORM MySQL models — `src/db/schema/`. IDs are `varchar(36)` UUIDs generated client-side (MySQL has no native UUID type or `RETURNING` clause).
- **Authentication**: register, login, logout, email verification, password reset — `src/app/api/auth/*`, `src/lib/auth/*`. Scrypt password hashing (Node's built-in, no native binary — see the comment in `src/lib/auth/password.ts` for why, given the shared-hosting deploy target), server-side sessions (`HttpOnly`/`Secure`/`SameSite=Lax` cookie, hashed token in the database), rate limiting on login/register/reset, generic responses that never leak whether an email is registered.
- **RBAC**: permissions stored in the database (`src/lib/rbac.ts`), checked server-side on every request via `requirePermission()`/`requireAnyRole()` — never inferred from a client claim. `/dashboard/*` and `/admin/*` are gated in their Server Component layouts (not `middleware.ts` — session validation needs the `mysql2` driver, which needs the Node.js runtime, not the Edge runtime `middleware.ts` traditionally runs under).
- **IDOR-safe query pattern** demonstrated and tested: scope every lookup by `(user_id AND id)`, never `id` alone.
- **Price resolution** (`src/lib/pricing.ts`): the PKR 800 enrollment price, and every future price, is read from the `prices` table server-side — the function has no parameter for a client-supplied amount at all.
- **`audit_logs` is insert-only at the database level**, not just by convention — via a real, working, but MySQL-specific mechanism (see "Two database users" below), verified by an automated test that the restriction actually blocks UPDATE/DELETE/TRUNCATE.
- **18 automated tests, all passing** against a real local MySQL instance (`pnpm test`): password hashing round-trip, RBAC grant/deny (including "a student cannot reach an admin action"), the Student-A-cannot-read-Student-B IDOR test, price resolution correctness, and the audit_logs grant enforcement.
- **`next build` succeeds**, all V1 route shells (`/`, `/login`, `/register`, `/dashboard`, `/admin`) render and were manually smoke-tested end-to-end against a running instance: register → login → session-gated dashboard access → RBAC-gated admin (404 for a non-admin, 200 for an admin) → logout → access revoked → rate limiting kicks in after repeated bad logins.
- **The existing marketing site's own build was re-verified** after adding this workspace package — 58 pages, unaffected.

## Two database users — why, and what it means for you

MySQL's privilege model is purely additive across scopes: unlike Postgres, you cannot `REVOKE` a privilege from one table if it was granted at the database level (`GRANT ALL ON db.*` already includes UPDATE/DELETE/DROP on every table, and no later table-level `REVOKE` can subtract from that). The only correct way to make `audit_logs` genuinely append-only is to never grant it broadly: every table's privileges are granted individually, and `audit_logs` simply never receives UPDATE, DELETE, or DROP.

This means the app needs **two MySQL users**:
- A **full-privilege admin user** — runs migrations (`pnpm db:migrate`) and `pnpm db:apply-grants`. This would typically be whatever user Hostinger's hPanel creates by default for a new database.
- A **narrower runtime user** — the one the deployed app (and only the app) actually connects as. `apply-grants.ts` provisions its grants automatically: SELECT/INSERT/UPDATE/DELETE on every table except `audit_logs`, which gets SELECT/INSERT only. No DDL anywhere.

**Open question, not yet confirmed**: creating that second user's grants requires the admin user to have `GRANT OPTION`. Whether Hostinger's hPanel-issued MySQL user has this is unverified — see `docs/LMS_PRE_PHASE_2_REVIEW.md` §15. If it turns out not to be available, the practical fallback is running everything as one user and relying on application code alone to never issue UPDATE/DELETE against `audit_logs` (still true today, just not database-enforced) — a real, disclosed reduction from what the original Postgres design could guarantee more simply.

## What still needs a human — I could not do these myself

I do not have a browser, Hostinger login, or any external account credentials in this sandbox. These are one-time actions, not permission requests — the code above works today against a local database; these are what turn it into a *deployed* app.

1. **hPanel's "Setup Node.js App" wizard**, run once against the `learn.shahidiqbal.com` subdomain you already created: set the application root to that subdomain's directory, the startup file to `server.js` (the file `next build`'s `output: 'standalone'` produces), and confirm which Node.js version the wizard offers (needs 20+; the app is built and tested against 22).
2. **Create the MySQL database and its two users** in hPanel's "MySQL Databases" section: one database, the default full-privilege user hPanel gives you (this becomes `LMS_DATABASE_ADMIN_URL`), and check whether that user's privileges include `GRANT OPTION` — if hPanel's UI doesn't show this, phpMyAdmin's `SHOW GRANTS` for that user will.
3. **Confirm the app restart mechanism.** `.github/workflows/deploy-lms.yml`'s last step touches `tmp/restart.txt` in the app directory — the standard Phusion Passenger convention, which is what cPanel/Hostinger's Node.js Selector is built on. I have no way to verify this actually triggers a restart on your specific plan without hPanel access; if it doesn't, the workaround is clicking "Restart" in hPanel after each deploy until we find the real hook.
4. **GitHub Actions secrets**, once you have the values: `LMS_DATABASE_ADMIN_URL` (the full-privilege user's connection string), `LMS_SESSION_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `LMS_APP_URL` (`https://learn.shahidiqbal.com`), and optionally `DEPLOY_LMS_PATH` if the subdomain's directory ever changes from what's hardcoded in the workflow. The narrower runtime user's connection string (`LMS_DATABASE_URL`) gets provisioned by `apply-grants.ts` itself, using a name/password you choose. `DEPLOY_SSH_KEY`/`DEPLOY_HOST`/`DEPLOY_PORT`/`DEPLOY_USER` are reused from the existing marketing-site deploy — no new secret needed for those.

Until #1 and #2 are done, `.github/workflows/deploy-lms.yml` will run on every push to `apps/learn/**` and fail at the build step (missing database secrets) — that's the env validation in `src/lib/env.ts` working as designed (fail loud, not silently), not a bug. It's safe to leave failing; it touches nothing on the live marketing site either way.

## Local development

```bash
cd apps/learn
cp .env.example .env   # then edit DATABASE_URL/DATABASE_ADMIN_URL/SESSION_SECRET
pnpm install            # from the repo root, once, covers this workspace too

pnpm db:migrate                                    # runs as DATABASE_ADMIN_URL (needs DDL)
pnpm db:apply-grants                               # runs as DATABASE_ADMIN_URL, provisions the narrow user
pnpm db:seed                                       # runs as DATABASE_URL (the narrow user) — fake accounts, dev password DevPassword123!
pnpm dev                                           # runs as DATABASE_URL
```

Running the test suite needs a second, separate database (never point it at dev), with the same two-user setup:

```bash
# Create learn_with_shahid_test and its admin + app users the same way as dev, then:
TEST_DATABASE_URL=mysql://<admin>@.../learn_with_shahid_test pnpm db:migrate
DATABASE_ADMIN_URL=mysql://<admin>@.../learn_with_shahid_test DATABASE_URL=mysql://<app>@.../learn_with_shahid_test pnpm db:apply-grants

TEST_DATABASE_URL=mysql://<admin>@.../learn_with_shahid_test \
TEST_APP_DATABASE_URL=mysql://<app>@.../learn_with_shahid_test \
TEST_DB_ADMIN_URL=mysql://<a-user-with-full-privileges>@.../learn_with_shahid_test \
  pnpm test
```

`TEST_DB_ADMIN_URL` is a privileged connection used only by the test harness to reset all tables (including `audit_logs`) between tests — the app's own runtime user deliberately can't do that (see above), so test cleanup needs a separate, more-privileged connection. Never point any of these at anything but a local/throwaway test database.

## Not built yet (by design — see `docs/LMS_V1_SCOPE.md` and `LMS_IMPLEMENTATION_PLAN.md`)

Admin dashboard content (Phase 3), student dashboard content beyond the shell (Phase 4), courses/lessons/quizzes (Phase 5), the actual enrollment purchase flow (Phase 6), payments (Phase 7), communities UI (Phase 8), certificates (V2), and everything else the phased plan lists. This README will be updated as each phase lands.
