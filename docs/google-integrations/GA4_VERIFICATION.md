# Google Analytics 4 — Verification

## 1. OAuth and scope

`analytics.readonly` (`src/lib/google/oauth.ts`) — correct, minimum-necessary scope for both the GA4 Admin API (property listing) and the GA4 Data API (reporting). Verified by direct reading.

## 2. API surface used

`src/lib/google/analytics.ts` calls:
- `GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries` — list every account/property the authenticated user can access, in one call (the documented, current way to enumerate GA4 properties)
- `GET https://analyticsadmin.googleapis.com/v1beta/properties/{propertyId}` — property details (timezone, currency)
- `POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport` — the GA4 Data API, the current reporting endpoint (not the deprecated Universal Analytics Reporting API, which this app never uses)

All current, non-deprecated endpoints.

## 3. Is property ID `542032135` actually valid and accessible?

**This cannot be confirmed from this sandboxed environment** — there is no real Google OAuth credential available here, so no real call to `accountSummaries` can be made against the actual connected Google account. The brief is explicit that this must not be assumed correct "solely because it is displayed," and this audit takes that seriously: **nothing in this report claims `542032135` is valid.**

What this audit did instead, which is the most it can honestly do without real credentials:

1. **Added `verifyAnalyticsConnection`** (`actions.ts`) — a "Test connection" action that re-fetches the live `listAccessibleProperties()` result and checks the stored `propertyId` is still present in it, *before* re-running a real report query. This is the mechanism that answers the brief's question — correctly, against real data — the next time someone with real Google credentials clicks "Test connection" on `/dashboard/google/analytics`.
2. **Verified the mapping logic itself is correct** via the pre-existing test suite (`tests/analytics.test.ts`, 10 tests passing): given a realistic `accountSummaries` response shape, `listAccessibleProperties()` correctly flattens it and strips the `properties/` prefix to produce a bare numeric ID matching the stored format (`"123456789"`, not `"properties/123456789"`) — so *if* `542032135` is genuinely accessible, the code will correctly recognize it as a match; the code was not the open question, the live account state is.

**Until someone with real Google account access clicks "Test connection" against production, whether `542032135` is valid remains unverified — this is stated plainly rather than assumed either way.**

## 4. Report content

| Brief requirement | Status |
|---|---|
| Sessions, users, views | **Partially present.** Top-pages table already showed `screenPageViews` (views) and `activeUsers`. Traffic Acquisition table (added this phase) adds `sessions`. |
| Engagement metrics | `engagementRate` added to the Traffic Acquisition table this phase |
| Traffic acquisition | **Added** this phase — a new table by `sessionDefaultChannelGroup` |
| Landing pages | **Not added.** GA4's `landingPage` dimension is a real, well-supported dimension, but adding it risks the report becoming a loosely-organized dump of tables rather than something coherent — flagged as the clearest next addition once there's a real account to confirm it returns meaningful data for this property, consistent with the brief's own "do not build the full dashboard before the connection is reliable" instruction. |
| Conversions | **Not added**, deliberately. GA4 conversions require "key events" to be configured on the property first; querying a `conversions` metric on a property with none configured returns a technically-valid but empty/zero response, which risks being misread as "conversions are broken" rather than "none are configured yet." Documented here as blocked on confirming key-event configuration exists, not silently skipped. |
| Missing metrics / insufficient permissions / quota errors / expired auth handled clearly | Now handled uniformly via `classifyGoogleApiError()` — see §6 |
| Avoid duplicate syncs / duplicate event counts | See §5 |
| No new tracking scripts, no consent changes | **Confirmed untouched** — this audit only reads existing GA4 Data API report data through the already-connected OAuth credential; it does not add, modify, or reference any client-side analytics script, tracking pixel, or consent mechanism anywhere in `apps/admin` or any other app in this repo |

## 5. Duplicate-sync risk

The brief asks to "avoid duplicate syncs and duplicate event/conversion counts." As implemented, this integration has no write/sync operation that could duplicate anything: every report render is a fresh, read-only `runReport` call against Google's API, displayed directly — there is no local event ledger this app maintains that a duplicate sync could double-count into. The only persisted state is the property *selection* (`analytics_connections`, one row per connection, confirmed by the pre-existing test `'replaces an existing selection rather than creating a second row'`) and the new `lastSyncedAt`/`google_sync_logs` timestamp (append-only log of sync *attempts*, not of any counted metric — recording a sync twice doesn't double anyone's session count). No code change was needed for this requirement; documented here as verified-by-architecture rather than silently assumed.

## 6. Error states

Same shared classification as Search Console (`classifyGoogleApiError()`): 401 → "reconnect," 403 → "this Google account can't access this property," 429 → "quota exceeded, try again shortly," 404 → "property not found, it may have been removed or renamed," anything else → the real error text, unmodified.

## 7. Date range and caching

A 7/28/90-day selector was added (previously hardcoded to 28 days, no way to change it). No caching layer was added, for the same reasoning as Search Console (§7 of that doc) — not because it isn't appropriate, but because there's no evidence yet of a quota problem it would solve, and a half-justified cache is worse than a documented gap. `lastSyncedAt` now correctly tracks the last *successful* report read specifically (not the OAuth connection time, not the last selection save) — this was previously never written for GA4 at all.

## 8. Verification level

| Claim | Verification level |
|---|---|
| Scope is `analytics.readonly`, minimum-necessary | Verified from code |
| API endpoints are current (Admin API v1beta, Data API v1beta), not deprecated | Verified from code + Google's documented current API surface |
| `listAccessibleProperties` correctly flattens real API response shapes, strips the `properties/` prefix | Verified by the existing automated test suite |
| `runAnalyticsReport` sends the correct request shape and parses real response rows (including numeric-string metric parsing) | Verified by the existing automated test suite |
| Property ID `542032135` is actually valid and accessible to the connected account | **Not verified** — requires a real Google account to click the new "Test connection" action against production |
| New Traffic Acquisition table, date-range control, last-synced tracking, structured errors, Verify action | Verified by `pnpm typecheck`, `pnpm build`, and a live smoke test against a real local server + database with a seeded property selection (`542032135`, `shahidiqbal.com`) — the smoke test confirmed a real (401, from a deliberately fake token) Google API error renders correctly as "Authorization has expired or was revoked," not a crash or an unhandled exception |
| Whether this GA4 property actually has conversions/key events configured | Requires production verification — not assumed either way, not queried in this pass |
