# Google Search Console — Verification

## 1. OAuth and scope

`webmasters.readonly` (`src/lib/google/oauth.ts`) — correct, minimum-necessary scope for the Search Console API. Verified by direct reading, not assumed.

## 2. API surface used

`src/lib/google/searchConsole.ts` calls:
- `GET https://www.googleapis.com/webmasters/v3/sites` — list accessible properties
- `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query` — Search Analytics data

Both are the current, non-deprecated Search Console (Webmasters) API v3 endpoints. (A code comment in this file says "v1" — that's a stale comment, not a real version mismatch; the URL itself is correctly `v3`. Left as a minor documentation inconsistency, not fixed in this pass since it's a comment, not behavior — noted here instead.)

## 3. Domain vs. URL-prefix properties

Google's `sites.list` response mixes both property types in one list, distinguished only by the `siteUrl` format: a domain property comes back as `sc-domain:example.com`; a URL-prefix property comes back as a real URL like `https://example.com/`. The code already passed either value straight through unchanged to every endpoint — mechanically correct, confirmed by the existing test suite's explicit `sc-domain:shahidiqbal.com` test cases in `tests/searchConsole.test.ts` (pre-existing, not added by this audit).

**What was missing, now fixed:** nothing in the UI ever explained the distinction, so an admin facing a picker listing both `https://shahidiqbal.com/` (the currently-selected property, per the brief) and `sc-domain:shahidiqbal.com` (the owner's other accessible property) had no way to understand what each one actually covers. `src/app/dashboard/google/search-console/page.tsx` now:
- Labels each picker row "Domain property" or "URL-prefix property"
- Shows the same label next to the currently-selected property
- Adds one explanatory paragraph: a domain property covers every protocol/subdomain/path verified for that domain in one property; a URL-prefix property covers only that exact prefix, and the two can report different totals for the same site

**This audit does not change which property is selected.** The existing `https://shahidiqbal.com/` selection is untouched. Changing to the domain property is the owner's choice to make from the picker, now that the picker explains what each option means — not something this audit decided for them.

## 4. Property selection safety

Already correct, unchanged: `selectSearchConsoleSite` (`actions.ts`) re-fetches the live accessible-sites list, confirms the submitted `siteUrl` is actually in it, runs a real test query (`testSearchConsoleAccess`), and only then saves — never trusting the submitted form value, never skipping the test. Confirmed by both direct reading and the pre-existing `tests/searchConsole.test.ts` suite (15 tests, all passing).

**The brief's instruction "do not automatically replace the existing selection"** is already satisfied by the existing design: the picker only renders when `change=1` is explicitly requested or no selection exists yet; viewing the page never silently changes or re-prompts the selection.

## 5. Report dimensions and metrics

| Brief requirement | Status |
|---|---|
| Clicks, Impressions, CTR, Average position | Already present — these are GA's/GSC's always-returned metrics regardless of dimension choice, shown in every table |
| Queries | Already present (`dimensions: ['query']`) |
| Pages | Already present (`dimensions: ['page']`) |
| Countries | **Added** this phase (`dimensions: ['country']`) |
| Devices | **Added** this phase (`dimensions: ['device']`) |
| Search appearance | **Not added.** Google's `searchAppearance` dimension only returns rows for pages with rich-result markup (FAQ, breadcrumbs, etc.) — adding an always-empty table for a site that may have none would violate the brief's own "do not fabricate/pad when the API returns no data" principle more than it would help. Flagged here as a straightforward follow-up once there's a real account to confirm whether shahidiqbal.com has any rich-result-eligible pages. |
| Date filters | **Added** this phase — a 7/28/90-day selector (`?days=`), previously hardcoded to 28 days with no way to change it |
| Query/page/country filters don't silently change the selected property | The new day-range control is a separate query param (`days`) that never touches the `siteUrl` selection logic — confirmed by reading the implementation: `selection` is read fresh from the database on every render, `days` only affects the date range passed to `querySearchAnalytics` |

## 6. Error states

Previously: one undifferentiated error string for every failure mode. Now, via the shared `classifyGoogleApiError()` (`src/lib/google/connections.ts`):

| HTTP status embedded in the thrown error | Shown as |
|---|---|
| 401 | "Authorization has expired or was revoked. Reconnect this integration..." |
| 403 | "The connected Google account does not have permission to access this property..." |
| 429 | "Google API quota was exceeded for this request. This is usually temporary..." |
| 404 | "The selected property...could not be found. It may have been removed or renamed..." |
| anything else | The real error text, unmodified (never hidden) |

Loading state: implicit via Next.js Server Component streaming (the panel renders once its data resolves — no separate skeleton was added, matching the existing pattern used by every other panel in this app). Empty state: unchanged, already correct ("No data for this period."). Stale-data state: addressed via the new "Last synced" timestamp (see below) rather than a separate UI flag — an admin can now see exactly how fresh the data is.

## 7. Caching and last-synced tracking

**This was the most significant real gap found.** Every page load already ran 5 live Search Analytics queries (now: query, page, country, device, plus the 50-row opportunity-detection query) with zero caching and zero record of when a sync last actually succeeded. `google_connections.lastSyncedAt` existed in the schema but was never written to for this integration.

**Fixed:** a successful `PerformancePanel` render now calls `recordSuccessfulSync(connectionId, 'search_console_report')`, which updates `lastSyncedAt` and appends a `google_sync_logs` success row — but only ever on success, never on failure, so a failed request can never advance or fabricate a sync timestamp. The "Last synced" timestamp is now shown on the page itself.

**No new caching layer was added.** The brief says "add safe caching if appropriate" — given Search Analytics data updates roughly daily on Google's own side and the report page is viewed by admins, not end users, at low frequency, adding a caching layer (with its own staleness-tracking and invalidation logic) was judged to add real complexity for a quota-cost problem that doesn't appear to exist yet (no evidence of actual rate-limiting in this audit). Documented as a clear next step if real-world usage shows it's needed, rather than built speculatively.

## 8. New verification action

`verifySearchConsoleConnection` (`actions.ts`) — a "Test connection" button next to the selected property, running `testSearchConsoleAccess` against the **current** selection (not re-prompting for a new one) and recording the result the same way a successful report load does. Directly satisfies the brief's "Add a Test connection or equivalent safe verification action."

## 9. Verification level

| Claim | Verification level |
|---|---|
| Scope is `webmasters.readonly`, minimum-necessary | Verified from code |
| API endpoints are current (v3), not deprecated | Verified from code + Google's public API documentation structure |
| `listAccessibleSites`/`querySearchAnalytics`/`testSearchConsoleAccess` correctly map real API response shapes | Verified by the existing automated test suite (mocked `fetch`, real response shapes including an explicit `sc-domain:` case) |
| Select-then-test-then-save discipline | Verified by automated tests + direct code reading |
| New country/device dimensions, date-range control, domain/URL-prefix labeling, last-synced tracking, structured errors, Test connection action | Verified by `pnpm typecheck`, `pnpm build`, and a live smoke test against a real local server + real local MySQL database with a seeded `sc-domain:shahidiqbal.com` connection (see `TEST_RESULTS.md`) — **not** verified against Google's real API, since this sandboxed environment has no real Google OAuth credentials |
| Whether `https://shahidiqbal.com/` or `sc-domain:shahidiqbal.com` is the "right" property for this site's actual reporting needs | Requires the owner's decision — the picker now explains the distinction, but the choice is a business judgment this audit does not make |
| Real production data (does the current connection actually have valid tokens, does the account genuinely have access) | Requires production verification — see `REMAINING_BLOCKERS.md` |
