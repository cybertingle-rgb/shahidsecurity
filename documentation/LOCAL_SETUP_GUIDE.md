# Local Setup Guide

Full depth: manual §5 (Code Access and Modification Manual), §7.3 (Restoring source code).

## 1. Get the code

```bash
git clone https://github.com/cybertingle-rgb/shahidsecurity.git
cd shahidsecurity
git checkout <production-branch>     # or this backup branch, for documentation/schema too
```

## 2. Install dependencies

This is a single **pnpm workspace** covering the root Astro site and `apps/gateway`:

```bash
pnpm install     # whole workspace, one pass
```

If this fails with `ERR_PNPM_IGNORED_BUILDS`: your installed pnpm major version doesn't recognize `pnpm-workspace.yaml`'s `allowBuilds` key (pnpm v11+). Confirm your pnpm version matches what the config expects before changing the config — a mismatch here broke a real production build previously (commit `c4666f7`, per manual §5).

## 3. Point at a database

Both halves of `apps/gateway` need a reachable MySQL instance — there is none by default on a fresh clone, and any DB-touching route fails with `ECONNREFUSED 127.0.0.1:3306` until you set real values. See `DATABASE_RESTORATION_GUIDE.md` to stand one up, and `ENVIRONMENT_VARIABLES_REFERENCE.md` for every variable name you'll need (`ADMIN_DATABASE_URL`, `LEARN_DATABASE_URL`, `DATABASE_ADMIN_URL` at minimum).

Nothing seeds itself automatically — run migrations, `apply-grants`, and the relevant seed script(s) by hand (manual §3.2 explains why; an old auto-seed-on-startup behavior was deliberately removed).

```bash
cd apps/gateway
pnpm db:admin:migrate && pnpm db:admin:apply-grants
pnpm db:learn:migrate && pnpm db:learn:apply-grants
```

## 4. Run it

```bash
pnpm dev                          # Astro marketing site, repo root, http://localhost:4321 by default
cd apps/gateway && pnpm dev       # gateway, http://localhost:3100
```

The gateway's dev server copies the Astro site's **last build** on startup — it is not a live reflection of Astro source edits. Rebuild the Astro site to pick those up.

## 5. Build and validate before you consider a change done

```bash
pnpm build                            # root: astro check && astro build — fails outright on error
cd apps/gateway && pnpm build         # gateway: rebuilds the Astro site internally too
```

**Never run `next build` directly inside `apps/gateway` as your real test** — it skips the Astro build/copy step entirely and will serve stale marketing pages. The gateway's own `build` script is the one that does this correctly (manual §2).

```bash
pnpm astro check                      # root
cd apps/gateway && pnpm typecheck && pnpm lint
cd apps/gateway && pnpm test:admin && pnpm test:learn   # both require a reachable test database — see ENVIRONMENT_VARIABLES_REFERENCE.md's TEST_* row
```

## Finding the code behind a page

Start at the page file (`.astro` or `page.tsx`) → find its data source (`fetch()` target or co-located `actions.ts`/`route.ts`) → follow into `admin-core/lib/*` or `learn-core/lib/*`, which is where the real database query lives. Three worked examples are in manual §5.
