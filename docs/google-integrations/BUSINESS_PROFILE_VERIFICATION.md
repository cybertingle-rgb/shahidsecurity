# Google Business Profile — Verification

## 1. OAuth and scope

`business.manage` (`src/lib/google/oauth.ts`) — this is the correct scope for the Business Profile Account Management and Business Information APIs used here. It is a broader scope than strictly "read-only" (Google does not offer a narrower read-only scope for these specific APIs as of the APIs this code targets) — confirmed by reading the actual API calls made (`listAccounts`, `listLocationsForAccount`, `testBusinessProfileAccess`, and the sync read in `syncBusinessProfile`): every one is a `GET`, never a write. The app itself never performs a write against the Business Profile API; the broader scope is Google's requirement, not an over-ask by this app.

## 2. API surface used

`src/lib/google/businessProfile.ts` calls:
- `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts` — list accessible accounts
- `GET https://mybusinessbusinessinformation.googleapis.com/v1/{accountId}/locations` — list locations under an account
- `GET https://mybusinessbusinessinformation.googleapis.com/v1/{locationId}` — read one location (used for both the access-test and the "Sync now" refresh)

These are the current, supported Business Profile APIs (Account Management API + Business Information API), not the deprecated legacy My Business API v4.

## 3. The real, external blocker: Google project approval

**This is the single most important fact to understand about this integration, and it is not a code bug.** Unlike Search Console and GA4, Google's Business Profile management APIs are not available to a Google Cloud project through OAuth consent alone — Google requires a separate, manually-reviewed **API access request** per project before `mybusinessaccountmanagement.googleapis.com` or `mybusinessbusinessinformation.googleapis.com` will return anything but a permission error, regardless of how correctly the OAuth scope and token are configured. This review is sometimes denied outright for small, single-location businesses.

The brief's described current dashboard state — "connected" but "Google account: unknown," "No location selected," "Last sync: never" — is consistent with this: the OAuth connection step (which only needs normal consent) can succeed completely, while every subsequent API call to actually list accounts/locations fails, because the approval gate sits one layer deeper than OAuth.

**This audit does not and cannot resolve this** — it is a Google-side manual approval process outside this codebase. What this audit added: an explicit, accurate explanation of this exact constraint directly in the account picker UI (`src/app/dashboard/google/business-profile/page.tsx`), so an admin facing an empty list or a permission error understands why, rather than assuming the app is broken.

## 4. Account and location selection safety — already correct

Confirmed by direct reading and the pre-existing test suite (`tests/businessProfile.test.ts`, 8 tests passing), **no changes needed**:

- `AccountPicker`/`LocationPicker` never auto-select — even a single-item list requires an explicit click.
- `selectBusinessLocation` (`actions.ts`) re-fetches the account's real locations list, confirms the submitted `locationId` actually belongs to the submitted `accountId`, runs a real access test (`testBusinessProfileAccess`), and only then saves — directly satisfying the brief's "confirm that the selected location belongs to the chosen account."
- `syncBusinessProfile` (the "Sync now" button) re-reads only the already-selected location by its exact ID — it never re-picks "the first" location from a fresh list, confirmed by an existing test asserting the fetch URL contains the originally-saved `locations/222`, not any freshly-listed id.

## 5. What was fixed this phase

| Gap | Fix |
|---|---|
| The connected Google account's email was never displayed on this specific page (only on the overview `/dashboard/google` page) | Now shown directly under the selected-location line: `Google account: {connection.googleAccountEmail ?? 'unknown — ...'}` |
| Raw, undifferentiated error strings | `classifyGoogleApiError()` applied to both the account-list and location-list error states |
| "Sync now" failures were never recorded in `google_sync_logs` (only `audit_logs`), so `getLatestError()` never surfaced a failed sync attempt | `logSyncError` now called on sync failure, matching the pattern already used by the selection action |
| No explanation of the Business Profile API approval requirement | Added — see §3 |

## 6. Profile fields and review data — what's real vs. not available

The brief asks to "verify which profile fields and review metrics the current API permissions and supported endpoints allow" and to never invent review counts or ratings.

**Confirmed from the schema and code, not assumed:** `google_business_profiles.averageRating`/`reviewCount` columns exist but are **never populated anywhere in this codebase** — a comment on that schema right where they're defined already states why: the Business Information API's `locations.get` (the only Business Profile endpoint this app currently calls) does not return review/rating data at all; that requires either the Business Profile **Performance API** or the legacy My Business API v4's reviews resource, neither of which is wired up. The UI already correctly discloses this ("Rating/review count: not available from the currently-supported Business Information API... Managed directly in Google Business Profile") rather than showing a blank or fabricated number. **No change was made here** — this was already correctly handled, and wiring up real review data would be new scope (a new API integration), not a repair of an existing one, and was left out of this pass accordingly.

What the current API call *does* reliably return once access works: the location's `name` (resource id) and `title` — confirmed by the real response shape asserted in the existing tests.

## 7. Verification level

| Claim | Verification level |
|---|---|
| Scope (`business.manage`) is correct for the APIs actually called | Verified from code — confirmed every call is a read, despite the write-capable scope name |
| API endpoints are the current, supported Business Profile APIs, not the deprecated v4 | Verified from code + Google's documented current API surface |
| `listAccounts`/`listLocationsForAccount`/`testBusinessProfileAccess` correctly map real API response shapes | Verified by the existing automated test suite |
| Account/location selection never auto-picks, always confirms location-belongs-to-account | Verified by automated tests + direct code reading |
| New account-email display, structured errors, sync-failure logging, approval-requirement explanation | Verified by `pnpm typecheck`, `pnpm build`, and a live smoke test against a real local server + database with a seeded `business_profile` connection |
| Whether the connected Google Cloud project actually has Business Profile API approval | **Not verified — this is the central open question for this integration and can only be answered by checking Google Cloud Console's API access status for the real project, or by observing whether a real account/location list call succeeds in production** |
| The real connected Google account's actual identity, and whether a location is currently selected in production | Requires production verification — this audit did not touch, and cannot see, the real production `google_connections` row |
