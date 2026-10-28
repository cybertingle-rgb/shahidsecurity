# Google Integrations — Audit Report

**Date:** 2026-10-29. **Branch:** `claude/google-integrations-audit-repair`, created off `claude/wizardly-keller-yg0bj7`. **Scope:** `apps/admin` — the unified admin dashboard that now also absorbs what were previously separate "learn" and "booking" admin surfaces. This audit covers the three Google integrations under `/dashboard/google/*` only.

## 1. A factual correction made before any other work

The task brief asked this audit to "preserve the existing Auth0 implementation, user sessions, admin roles, permissions." **There is no Auth0 anywhere in this codebase** — confirmed by a repo-wide search (`grep -rln "auth0\|Auth0\|AUTH0"` across `apps/admin/src` and `package.json`): zero matches, and no Auth0 package is installed.

The real authentication system, read directly from source:

- **Sessions** (`src/lib/auth/session.ts`): a custom httpOnly cookie (`ssa_session`) holding a random 32-byte token. The token itself is never stored — only its SHA-256 hash, in an `admin_sessions` table with a 12-hour expiry, validated against the database on every single request via `getSessionUser()`. Nothing about the session is trusted from the client beyond the opaque token.
- **RBAC** (`src/lib/rbac.ts`): granular, database-backed permissions (`admin_permissions` → `admin_role_permissions` → `admin_roles` → `admin_user_roles`), re-read from the database on every check via `requirePermission()` / `userHasPermission()` — never a hardcoded `if (role === 'admin')`. A single `super_admin` role is granted every permission implicitly. `requirePermission` throws (`ForbiddenError`) rather than returning a boolean, so a forgotten check fails loudly.
- Every Server Action that touches Google integration state (`selectBusinessLocation`, `selectAnalyticsProperty`, `selectSearchConsoleSite`, `syncGoogleBusinessProfile`, `disconnectGoogleScope`, and the two new `verify*Connection` actions added in this phase) calls `requireAdminAction('google.manage')` as its first line — confirmed by direct reading, not assumed.

This correction doesn't change any code — "preserve the existing implementation" is honored by working with the system that actually exists. It's documented here because treating the brief's premise as fact without checking it would have been exactly the kind of unverified assumption this whole audit exists to prevent.

## 2. Architecture (as it actually exists, read directly from source)

**OAuth** (`src/lib/google/oauth.ts`): one OAuth client, three independent scope-gated connections (`business_profile`, `analytics`, `search_console`), each with its own `access_type=offline&prompt=consent` flow to guarantee a refresh token. State-cookie CSRF protection (`GOOGLE_OAUTH_STATE_COOKIE`, byte-for-byte checked against what Google returns). Scopes, confirmed minimum-necessary:

| Scope name | OAuth scope string | Correct for its API? |
|---|---|---|
| `business_profile` | `https://www.googleapis.com/auth/business.manage` | Yes — required for Business Profile Account Management + Business Information APIs |
| `analytics` | `https://www.googleapis.com/auth/analytics.readonly` | Yes — read-only, correct for Admin API + Data API |
| `search_console` | `https://www.googleapis.com/auth/webmasters.readonly` | Yes — read-only, correct for the Search Console (Webmasters) API |

**Token storage** (`src/lib/crypto.ts`, `src/db/schema/google.ts`): access/refresh tokens are AES-256-GCM encrypted at rest (`google_connections.accessTokenEnc`/`refreshTokenEnc`), keyed by `TOKEN_ENCRYPTION_KEY` (32 bytes, hex). Decrypted tokens are never returned to the client, logged, or written to `audit_logs` — confirmed by reading every call site of `decryptAccessToken`/`getValidAccessToken`, all server-only. `getValidAccessToken()` (`src/lib/google/connections.ts`) refreshes automatically when a token is within 60 seconds of expiry and persists the new one.

**Per-scope connection model**: one row in `google_connections` per scope, plus a scope-specific selection table (`google_business_profiles`, `analytics_connections`, `search_console_connections`) holding the admin's explicit choice of account/property/site. A shared `google_sync_logs` table records every success/failure, queried via `getLatestError(connectionId)`.

**Existing discipline already correct before this audit, verified by direct reading and by the existing test suite (not assumed):**

- No integration ever auto-selects "the first" account/location/property. `src/db/schema/google.ts`'s own comments and the picker UIs require an explicit admin choice every time, even when only one option exists.
- Every selection action (`selectBusinessLocation`, `selectAnalyticsProperty`, `selectSearchConsoleSite`) re-validates the submitted value against a **fresh** call to the real accessible-list endpoint before saving — a tampered form field naming something the account doesn't actually have access to is rejected, not trusted.
- Every selection action performs a real, minimal test query against Google before marking the selection saved ("select, then test, then save" — never the reverse).
- Business Profile's location-save explicitly confirms the chosen location belongs to the chosen account (`listLocationsForAccount(accessToken, accountId)` then `.find()`), covering the brief's "confirm the selected location belongs to the chosen account" requirement with no change needed.

## 3. What this audit changed, and why

Full detail is in the three per-integration verification docs. Summary:

| Area | Gap found | Fix |
|---|---|---|
| All three | `google_connections.lastSyncedAt` was only ever updated by Business Profile's "Sync now" button — GA4 and Search Console had **no** equivalent, so their "last synced" state was indistinguishable from "never connected" even while actively rendering live data on every page load | Added `recordSuccessfulSync()` (`src/lib/google/connections.ts`), called after every successful live report query in all three integrations, never on failure |
| All three | Raw Google error text (e.g. `"Failed to list...: 401 {...}"`) was shown directly to the admin, collapsing "your login expired" / "you don't have permission" / "Google is rate-limiting us" into one undifferentiated string | Added `classifyGoogleApiError()`, parsing the embedded HTTP status into an actionable category (expired token / permission denied / quota exceeded / not found / unknown), applied everywhere an integration shows a fetch error |
| All three | No "Test connection" action — the only way to find out an integration had actually broken was to notice stale or missing data | Added `verifySearchConsoleConnection` and `verifyAnalyticsConnection` Server Actions (Business Profile's existing "Sync now" already serves this role) |
| Search Console | The domain-vs-URL-prefix distinction the brief explicitly asked to be explained was never explained anywhere in the UI — both property types were listed as bare strings | Added inline labeling ("Domain property" / "URL-prefix property") and an explanatory paragraph in the picker and the selected-property display |
| Search Console | No date-range control (hardcoded to the last 28 days); no country or device breakdown | Added a 7/28/90-day selector and Country + Device dimension tables |
| GA4 | The stored `propertyId` was never re-verified against the account's live accessible-properties list — exactly the "assume connected means correct" failure mode the brief calls out by name | `verifyAnalyticsConnection` re-checks the property is still present in a fresh `listAccessibleProperties()` call before re-testing access |
| GA4 | No breakdown beyond top pages (no traffic-acquisition view); no date-range control | Added a Traffic Acquisition table (channel, sessions, active users, engagement rate) and the same 7/28/90-day selector |
| Business Profile | The connected Google account's identity was never displayed on this page (only on the overview page) — matches the brief's reported "Google account: unknown" symptom | Now shown directly on the Business Profile page |
| Business Profile | No explanation of the real, external Google Cloud approval requirement for the Business Profile management APIs | Added an explicit, accurate explanation in the account picker |
| Business Profile sync | Sync failures were never written to `google_sync_logs` (only `audit_logs`), so `getLatestError` never surfaced a failed "Sync now" attempt | Wired `logSyncError` into the sync-failure path, consistent with the other two integrations |

**A pre-existing, unrelated regression found and fixed in passing:** `tests/renderBlogPost.test.ts` imported `js-yaml` with a default import (`import yaml from 'js-yaml'`), which broke when an earlier session upgraded `js-yaml` to 5.x (which dropped the CommonJS-style default export). This made the test suite fail to run at all before this audit's own tests could be added. Fixed with the same namespace-import pattern already used in `src/lib/publish/renderBlogPost.ts`. Documented in `TEST_RESULTS.md`.

## 4. What was deliberately NOT done

- **No DB migration.** `google_connections.lastSyncedAt` already existed in the schema — it was simply never wired up for two of the three integrations. No new columns were needed.
- **No change to the OAuth flow, the token-encryption scheme, the session system, or RBAC.** All three integrations' core trust model was already correct.
- **No disconnect, revoke, or overwrite of any existing integration.** Nothing in `src/lib/google/oauth.ts`'s token-exchange/refresh logic, `disconnectScope()`, or any existing `google_connections` row was touched beyond the additive `lastSyncedAt`/`google_sync_logs` writes this phase's own new successful-sync recording performs.
- **The full SEO dashboard (brief section 6) was not built.** See `REMAINING_BLOCKERS.md` — the brief itself says not to build it until the underlying connection is verified against a real Google account, which this sandboxed environment cannot do (see `TEST_RESULTS.md` for exactly what could and couldn't be verified).
- **Nothing was pushed, merged, deployed, or committed.** All changes exist only in this branch's working tree, per the brief's explicit restriction.
