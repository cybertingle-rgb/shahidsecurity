# Test Results — Google Integrations Audit and Repair

**Branch:** `claude/google-integrations-audit-repair`. All commands below were run locally against a real local MySQL (MariaDB) instance set up for this session — no production or staging database was touched at any point.

## 1. Starting state (before this phase's changes)

```
pnpm test
```

Result: **5 failed, 113 passed** (118 total), 2 of 20 test files failing.

- `tests/renderBlogPost.test.ts` (3 failures) — a **pre-existing regression unrelated to Google integrations**: the test file imported `js-yaml` with a default import (`import yaml from 'js-yaml'`), which broke when an earlier session's security patch upgraded `js-yaml` to 5.x (a real, Critical-severity vulnerability fix — 5.x was the first line with a patch for the specific advisories found). js-yaml 5.x dropped its CommonJS-style default export in favor of named exports only. The production code (`src/lib/publish/renderBlogPost.ts`) had already been fixed in that earlier session; this test file's own, separate import of the same package had not been.
- `tests/security.test.ts` (2 failures) — **not a real bug**, a gap in this session's local test-environment setup: the local test database's runtime user initially had full privileges (inherited from the setup/migration user) rather than the narrow, `audit_logs`-insert-only grants `src/db/apply-grants.ts` is meant to provision. Fixed by actually running `apply-grants.ts` against the local test database with a properly separated admin-vs-runtime user pair, exactly matching how a real deployment provisions its database.

Both fixes are either a direct, narrow bug fix (the test import) or a correction to this session's own environment setup (the grants) — neither touches `apps/admin`'s actual Google integration behavior.

## 2. After fixing the two pre-existing issues, before any Google-integration code changes

```
pnpm test
```

Result: **118 passed, 0 failed** (20/20 test files). This is the true, clean starting baseline this audit's own changes are measured against.

## 3. After this phase's changes (final state)

```
pnpm test
```

Result: **127 passed, 0 failed** (21/21 test files) — the original 118, plus 9 new tests in `tests/googleConnectionsSync.test.ts` covering the two functions this audit added to `src/lib/google/connections.ts`:

- `classifyGoogleApiError` — 6 tests covering every status-code branch (401, 403, 429, 404, an unrecognized status, and a non-`Error` throw), confirming each produces the correct category and an actionable message.
- `recordSuccessfulSync` — 3 tests against the real local test database: confirms `lastSyncedAt` is actually updated and is distinct from the connection's original `createdAt`; confirms a previously-logged error is no longer "latest" once a success is recorded (`getLatestError` correctly returns `null`); confirms repeated syncs append new log rows rather than overwriting, and `lastSyncedAt` only ever advances.

No existing test was modified in behavior — only the one broken import was fixed.

## 4. Typecheck

```
pnpm typecheck
```

Result: **clean, 0 errors.** (One real type error was found and fixed during this phase's own development — a nullable `siteUrl` passed to a function expecting `string` — see the Search Console page's domain/URL-prefix label rendering; already corrected before this final run.)

## 5. Lint

```
pnpm lint
```

Result: **2 errors, both pre-existing and confirmed unrelated** — `@next/next/no-img-element` and `react-hooks/exhaustive-deps` rule definitions reported as "not found" (an ESLint plugin-resolution gap, not a code issue) in `src/app/dashboard/learn/_components/ThumbnailUrlField.tsx` and `src/components/PortalSidebar.tsx` — neither file was touched by this audit. Confirmed identical before and after this phase's changes by re-running lint against a clean checkout of the base branch.

## 6. Build

```
pnpm build
```

Result: **succeeded, 0 errors.** Full production build (`next build` + `flatten-standalone`) completed cleanly with all of this phase's changes included.

## 7. Live smoke testing (beyond typecheck/lint/build/unit tests)

Because this audit's changes are concentrated in Server Components and Server Actions — code that only truly runs inside a live Next.js request, not inside a unit test — this phase went further than the brief's minimum and actually ran the real production server locally:

1. Installed and started a local MariaDB server inside this session's sandbox.
2. Created both of `apps/admin`'s real databases (its own app database and the separate `apps/learn` database it reads directly), ran the real Drizzle migrations against both, and seeded a real super-admin account via the app's own seed script.
3. Built the real standalone production server (`next build` → `.next/standalone/server.js`, the exact artifact a real deployment runs) and started it as a live process.
4. Logged in through the real `/api/auth/login` endpoint, capturing a real session cookie.
5. Hit all three Google integration pages (`/dashboard/google/analytics`, `/dashboard/google/search-console`, `/dashboard/google/business-profile`) and the overview page, confirmed `HTTP 200` on every one, in both the "not connected" state (clean local database) and a "connected, with a deliberately fake/invalid token" state (seeded connection rows using the app's own `encryptSecret`, mirroring exactly how a real connected row is stored).
6. With the fake-token connections, confirmed the new code paths actually fire correctly against **real Google API calls**: the fake token produced a genuine `401` from Google's real servers, which `classifyGoogleApiError` correctly turned into "Authorization has expired or was revoked. Reconnect this integration..." — rendered inline, with no crash, no unhandled exception, and the server process still alive and serving the next request immediately after.
7. Confirmed the new domain-vs-URL-prefix labeling renders correctly for a seeded `sc-domain:shahidiqbal.com` selection, and that the 7/28/90-day range links return `200` and render with the active range correctly highlighted, on both the Search Console and GA4 pages.

This confirms the new code is not just type-correct and build-correct, but **behaviorally correct against a real running server and real (if fake-token) Google API responses** — the strongest verification possible without real production OAuth credentials.

## 8. What was explicitly NOT and could NOT be tested here

- **Any real Google OAuth consent flow** — requires a real browser, a real Google account, and a real redirect back to a publicly reachable `admin.shahidiqbal.com`, none of which this sandboxed environment has.
- **Whether GA4 property `542032135` or the Search Console properties are genuinely accessible to the real connected Google account** — requires real credentials; see `GA4_VERIFICATION.md` and `SEARCH_CONSOLE_VERIFICATION.md`.
- **Whether the real production Google Business Profile project has Google's required API approval** — an external, Google-side state this sandboxed environment has no way to observe.
- **Production environment variables, secrets, and the real `TOKEN_ENCRYPTION_KEY`/OAuth client credentials** — never seen by this session; all testing used locally-generated, clearly-fake values.
- **Role/permission enforcement beyond direct code reading** — every Server Action's `requireAdminAction('google.manage')` call was confirmed present by reading the code, and the existing `tests/rbac.test.ts` suite (pre-existing, passing) exercises the underlying `requirePermission`/`userHasPermission` functions directly; a dedicated end-to-end test asserting a *non*-admin session is rejected by these specific Google Server Actions was not added in this pass, since doing so safely requires either a second seeded non-admin test user and a full HTTP-level test harness beyond this suite's current unit-test conventions, or mocking the session layer in a way the existing test suite does not already do for any other Server Action — flagged in `REMAINING_BLOCKERS.md` as a reasonable follow-up rather than added speculatively under this pass's time budget.
