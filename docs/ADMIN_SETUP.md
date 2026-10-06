# Shahid Security Admin — local setup

## Prerequisites

- Node.js 22, pnpm 10 (same as apps/learn)
- A local MySQL/MariaDB server

## First-time setup

```bash
cd apps/admin
cp .env.example .env
```

Fill in `.env`:

- `DATABASE_URL` — a dev MySQL database, e.g.
  `mysql://admin_dev:yourpassword@127.0.0.1:3306/shahid_security_admin_dev`
  (create the database and a user yourself, or use a full-privilege
  local user directly for development only — never in production; see
  docs/DATABASE.md's two-user model).
- `SESSION_SECRET` — any random 32+ character string for local dev.
- `TOKEN_ENCRYPTION_KEY` — generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  Only required before connecting a Google account; the rest of the app
  works without it.
- Leave everything else blank for local dev.

From the repo root:

```bash
pnpm install
cd apps/admin
pnpm db:migrate        # requires DATABASE_ADMIN_URL set to a full-privilege user
pnpm db:apply-grants   # provisions the narrow runtime user DATABASE_URL points at
ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='a real strong password' pnpm db:seed-super-admin
pnpm dev
```

Then sign in at `http://localhost:3200/login` with the email/password you
seeded.

## Running tests

```bash
cd apps/admin
TEST_DATABASE_URL=<full-privilege test-db user> \
TEST_DB_ADMIN_URL=<same, for truncation> \
TEST_APP_DATABASE_URL=<narrow test-db runtime user> \
pnpm test
```

Uses a separate `shahid_security_admin_test` database — never the dev
or production one. See `tests/globalSetup.ts` and `tests/testDb.ts`.

## Common checks before pushing

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

All four were run and passed clean as part of this app's own
development — not a theoretical checklist.
