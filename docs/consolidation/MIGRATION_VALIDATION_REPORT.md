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

## 1.1 Staging deployment, 2026-11-08

With your explicit go-ahead, deployed `apps/gateway` (branch
`claude/platform-consolidation-audit`, commit `6a31470`) to a free,
throwaway Hostinger site — `cyan-jellyfish-885366.hostingersite.com`,
created via `hosting_websites_create` with no domain specified. **No DNS
record, subdomain, or configuration on `shahidiqbal.com` itself was
touched** — this is a fully separate site on the same account, matching
`DEPLOYMENT_GUIDE.md` §4 step 3's "never the apex domain" instruction.

Build settings mirrored `admin.shahidiqbal.com`'s own proven working
configuration exactly (`node 22`, `app_type: next`, `root_directory:
apps/gateway`, `build_script: build`, `pnpm`) rather than guessed —
retrieved directly from `hosting_get-deployment` against the real admin
site first. Result: **build completed in 35.3s**, confirmed via the real
build log:

- `copy-astro-dist.mjs` correctly detected no Astro build at the repo
  root on this host (Hostinger's single-app build doesn't build other
  monorepo members) and fell back to its placeholder page, exactly as
  designed — not an error.
- `next build` compiled cleanly, registered the Proxy (middleware), and
  `flatten-standalone.mjs` reported a self-contained `server.js`.
- Hostinger's own publish step: "Detected Next.js standalone server
  output... Application restarted."

No `ADMIN_APP_URL`/`LEARN_APP_URL` env vars were set for this build, so
`next.config.mjs`'s defaults applied — meaning this staging deployment's
`/admin` and `/learn` rewrites point at the **real**
`admin.shahidiqbal.com`/`learn.shahidiqbal.com`, not mock servers.

**Not independently confirmed**: this session's own sandboxed network
egress cannot reach arbitrary internet hosts (confirmed directly — both a
local `curl` and a separate fetch agent were blocked at the network
level, `cyan-jellyfish-885366.hostingersite.com` resolving via
`ENOTFOUND`/`connect_rejected`, not a response from the site itself).
This is an environment limitation, not evidence of anything wrong with
the deployment. The deployment is live and the build/publish logs show
no error; actually confirming `/`, `/admin`, and `/learn` respond
correctly over the real internet needs a check from somewhere that isn't
this sandboxed session — i.e., you visiting the URL directly, or telling
me what you see.

## 1.2 Production cutover, 2026-11-08 — with your explicit go-ahead

You asked to skip further staging checks and deploy directly to
`shahidiqbal.com`. Before doing that, one real bug was caught and fixed
first (not skipped): the gateway's build script invoked the repo root's
own `pnpm run build`, which runs `astro check && astro build` — and
`astro check` prompted an interactive "install @astrojs/check? Yes/No"
confirmation on Hostinger's build host that would have hung forever with
no terminal to answer it. This was caught live, mid-deploy, on the
**first** production attempt (build `01a1bc59`, stuck at that prompt);
fixed by calling `astro build` directly instead of through the full
`pnpm run build` script (this only needs `dist/`, not a type-check pass —
the Astro site's own separate deploy pipeline, `.github/workflows/deploy.yml`,
is untouched and still runs the real check), verified locally, pushed,
redeployed.

**Also discovered while doing this** (correcting `PLATFORM_AUDIT.md` §2.1,
which described the Astro site as rsync-only): `shahidiqbal.com` was
already using Hostinger's own native build pipeline too
(`app_type: "astro"`, `root_directory: null`, `output_directory: "dist"`,
last built 2026-10-31 from `claude/wizardly-keller-yg0bj7`), not only the
GitHub Actions rsync — `hosting_get-deployment` wasn't checked for this
domain during Phase 1, only `hosting_websites_list`. This made the actual
cutover a same-mechanism config swap (astro app type → nodejs/gateway app
type) rather than two different systems to reconcile.

**Second build attempt (`01a1bc5b`) completed successfully**: 196 Astro
pages built, gateway build completed in 23.6s, published, application
restarted, total deployment 48.1s. `shahidiqbal.com` is now serving
`apps/gateway`.

**Not independently confirmed, same reason as §1.1**: this session cannot
reach `shahidiqbal.com` over the real internet to check it (the production
domain is almost certainly on this session's network allow-list already —
unlike the throwaway staging domain — but this wasn't re-tested after the
cutover; confirming `/`, `/admin`, `/learn` all actually work needs your
own check, or me retrying the fetch tools now that it's a known production
host).

**Rollback, if needed** — exact prior working configuration, captured
before this change: `hosting_deploy` with `domain: "shahidiqbal.com"`,
`type: "static"`, `git: {repository: "cybertingle-rgb/shahidsecurity",
branch: "claude/wizardly-keller-yg0bj7"}`, `appType: "astro"`,
`outputDirectory: "dist"`, `buildScript: "build"`. This restores exactly
what was live before, built from the production branch's own latest
commit.

## 1.3 Root cause of /admin and /learn not working, found and fixed

You checked `shahidiqbal.com` directly: `/` worked, `/admin` and `/learn`
did not. Root cause, confirmed via `hosting_get-deployment` before
touching anything: `admin.shahidiqbal.com` and `learn.shahidiqbal.com`
were still running their old deploys from `claude/wizardly-keller-yg0bj7`
(commit `b749770`) — the `basePath` change (§1 of this project, Phase 1)
was only ever pushed to `claude/platform-consolidation-audit` and had
never actually been deployed to either real app. The gateway was
correctly forwarding `shahidiqbal.com/admin/dashboard` to
`admin.shahidiqbal.com/admin/dashboard`, but that app's real routes were
still at the old `/dashboard` (no prefix) — nothing was listening at the
path the gateway was sending traffic to.

Fixed by redeploying both `admin.shahidiqbal.com` and
`learn.shahidiqbal.com` from `claude/platform-consolidation-audit`
instead, same build settings each was already using otherwise. Both
completed successfully: admin in 53.6s, learn in slightly longer (npm's
own install retry dance, unrelated — same thing its last few deploys have
also done). Both now have `basePath` live. Needs the same kind of
real-world check as §1.2 — asking you to look again.

## 1.4 Second real bug: basePath-unaware client fetch()/href calls

You checked again: `/admin` loaded but login didn't work. Root cause,
found by reading the actual login page component rather than guessing:
Next.js's `basePath` auto-prefixes `<Link>`, `useRouter()`, and
`redirect()` — it does **not** prefix a raw `fetch('/api/...')` call or a
plain `<a href="/api/...">`. The login page's
`fetch('/api/auth/login', ...)` requested `shahidiqbal.com/api/auth/login`
instead of `shahidiqbal.com/admin/api/auth/login`, which the gateway
never rewrites (its rules only match `/admin` and `/admin/:path*`), so it
fell through to the Astro catch-all and 404'd.

Audited both apps for this exact pattern (`fetch('/`, `href="/api`,
`src="/api`) rather than fixing only the reported symptom — found and
fixed 8 occurrences total: `apps/admin`'s login, reset-password,
forgot-password (fetch calls) and the media library page (an `<img>`
and an `<a>` pointing at `/api/media/[id]`); `apps/learn`'s login,
register, reset-password, forgot-password, verify-email (fetch calls)
and `GoogleButton` (the "Continue with Google" link). Added a small
`BASE_PATH` constant to each app and prefixed every one. Verified with a
clean typecheck and full production build for both, then redeployed both
— admin in 1m4s, learn in 1m17s (same npm install retry as its last few
deploys, unrelated).

## 2. What this report cannot yet claim

- **The staging deployment's actual response from the real
  `admin.shahidiqbal.com`/`learn.shahidiqbal.com` has not been confirmed
  by this session** (§1.1) — not because it wasn't attempted, but because
  this session's own sandboxed network egress cannot reach arbitrary
  internet hosts at all (confirmed directly, two different tools, both
  blocked at the network level before ever reaching the site). The
  *routing logic* (right path, right destination, right order of
  operations) was already proven against local mock servers before this
  deployment; whether it actually works against the real apps — a real
  login, a real session surviving navigation, real static assets loading
  under `/admin/_next/*` — needs a check from outside this session: you
  visiting `https://cyan-jellyfish-885366.hostingersite.com/admin` and
  `/learn` directly, or telling me what you see there.
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
