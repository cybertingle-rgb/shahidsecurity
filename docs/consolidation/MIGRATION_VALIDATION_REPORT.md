# Migration Validation Report — Full Consolidation Project

**Status:** covers what has actually been executed so far — local
build/typecheck/runtime verification only. Nothing below is staging or
production data; no deployment has happened yet. Per the brief's own
rule ("do not claim tests passed unless they were actually executed"),
every row states exactly what was run and where, not what should pass.

## 1. What has been executed, and the result

| Check | Where | Result |
|---|---|---|
| `apps/admin` typecheck (`tsc --noEmit`) after adding `basePath` | This branch, local | Clean |
| `apps/admin` production build (`pnpm build`) after adding `basePath` | This branch, local | Succeeded; all 65 routes built |
| `apps/learn` typecheck after adding `basePath` | This branch, local | Clean |
| `apps/learn` production build after adding `basePath` | This branch, local | Succeeded; all 41 routes built |
| `apps/gateway` typecheck | This branch, local | Clean |
| `apps/gateway` production build | This branch, local | Succeeded, no warnings (after fixing the Turbopack tracing warning — `UNIFIED_ARCHITECTURE.md` §9.1) |
| Astro site production build (`pnpm build` at repo root) | This branch, local | Succeeded, 196 pages |
| Gateway standalone server, `GET /` | This branch, local, running the actual compiled standalone output | `200`, real Astro homepage HTML |
| Gateway standalone server, `GET /about/` | Same | `200`, no redirect (the trailing-slash fix verified directly) |
| Gateway standalone server, `GET /about` (no slash) | Same | `308` → `/about/`, confirming the Astro-side trailing-slash rule fires correctly |
| Gateway standalone server, `GET /robots.txt` | Same | `200`, correctly exempt from trailing-slash handling (file-extension rule) |
| Gateway standalone server, `GET /admin`, `/admin/dashboard`, `/learn/courses` | Same, against two local mock HTTP servers standing in for the real admin/learn apps | Each proxied with the exact path preserved, confirmed from the mock servers' own received-path logging |
| Gateway standalone server, `GET /learn/admin`, `/learn/admin/students` | Same | `404`, confirming the duplicate-admin block (`UNIFIED_ARCHITECTURE.md` §4.1) fires before any proxy attempt |
| Gateway standalone server, `GET /nonexistent-xyz` | Same | Resolves to the Astro build's own `404.html`, not a generic Next error page |
| Gateway standalone server, path-traversal attempt against the catch-all file handler | Same | `404`, not a file outside `astro-dist/` |
| `apps/admin`/`apps/learn`'s own existing test suites (`vitest`) | — | **Not run in this pass.** Recommended before any real cutover — see §3. |

## 2. What this report cannot yet claim

- **Nothing has been tested against a real `admin.shahidiqbal.com` or
  `learn.shahidiqbal.com`** — every proxy test above used local mock
  servers standing in for them, because this environment has no outbound
  network access to the real domains. The *routing logic* (right path,
  right destination, right order of operations) is proven; the *real
  apps' actual response* through the gateway (a real login, a real
  session surviving navigation, real static assets loading under
  `/admin/_next/*`) is not — that needs a real staging deployment
  (`DEPLOYMENT_GUIDE.md` §4 step 3), which has not happened.
- **No security test suite was re-run** against the gateway-fronted
  setup — `SECURITY_REVIEW.md` §14 already flags this as the same
  recommendation.
- **No integration tests** (course appears in catalogue after creation,
  payment verification grants access, etc. — brief §14) have been run in
  this phase; none of this project's changes touch that logic, so none
  were expected to be affected, but "expected to be unaffected" and
  "verified unaffected" are different claims, and only the first is made
  here.

## 3. Recommended before any real cutover

1. Deploy to a staging domain (`DEPLOYMENT_GUIDE.md` §4 step 3) and repeat
   every row in §1 against the *real* admin/learn apps, not mock servers.
2. Run `apps/admin` and `apps/learn`'s own existing `vitest` suites —
   unaffected by this project's changes in principle, but not
   independently re-confirmed here.
3. A real login-and-navigate smoke test for both an admin account and a
   student account, through the staging gateway.
4. Only after 1–3 pass: proceed to the production cutover steps in
   `DEPLOYMENT_GUIDE.md` §4.
