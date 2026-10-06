# Google Business Profile integration

See `docs/GOOGLE_INTEGRATION_SETUP.md` for shared OAuth setup, required
environment variables, and getting real credentials — this doc covers
what's specific to Business Profile.

## Status: NEEDS_CONFIGURATION

Architecture-complete, live-untested (no real Google Cloud credentials
available to this session, and per Google's own docs there is no
sandbox for this API — Shahid will need to complete the Google Cloud
Console setup/approval himself; this code is ready for the moment that's
done). What's real and verified:

- OAuth connect/disconnect at `/dashboard/google`, scope
  `business.manage` (minimum necessary for this use — even though
  everything this app currently does is a read, see below).
- **Account/location picker** (`/dashboard/google/business-profile`):
  lists the real accounts the connected Google account can access
  (Account Management API), then the real locations under whichever
  account the admin picks — never assumes the first account or the
  first location is correct, per Phase 18M. The submitted location is
  re-checked against that account's real locations list server-side,
  then a real read against it confirms access, before the selection is
  saved to `google_business_profiles`.
- "Sync now" re-reads the already-selected location's current name from
  the Business Information API and refreshes the cached row — it never
  re-lists and re-picks "the first" location on its own; a selection
  must already exist.
- Verified live, without needing real OAuth credentials: a sync attempt
  against a connection holding a fake-but-correctly-AES-256-GCM-
  encrypted token made a genuine outbound call to Google's real API,
  which rejected it with an actual `401 UNAUTHENTICATED` — caught and
  logged to `audit_logs`/`google_sync_logs` rather than silently
  swallowed or faked as success.

## Known gap: rating and review count are not populated

`google_business_profiles.averageRating`/`.reviewCount` exist in the
schema but stay null. The Business Information API's `locations.get`
(what the current sync calls) doesn't return those — a real
implementation needs the Business Profile Performance API or the
legacy My Business API v4's reviews resource. Deliberately not guessed
at without being able to verify the actual response shape against a
live account, since shipping a wrong assumption here would look like it
works while actually fabricating or misreporting review data — exactly
what the standing no-fabrication rule exists to prevent.

## Read/write separation (Phase 18O)

Every function in `src/lib/google/businessProfile.ts` is a read:
listing accounts, listing locations, testing access, and re-reading a
selected location's name. There is currently no write/manage capability
at all — no post creation, no name/address edit, no review response —
so there is nothing to separately gate behind a confirmation step yet.
If a write capability is ever added, it must follow the same
confirm-exactly-what-will-change-then-execute-then-audit-log pattern
already used for destructive actions elsewhere in this app (e.g.
deleting a draft blog post), and must never be reachable by the same
`google.manage` permission that merely connects/reads.

## Never-do list (unaffected by any of the above)

This integration only ever reads what Google's API returns. It never
creates, edits, or responds to a review; never fabricates review
activity; never scrapes Google search results or automates the
Business Profile web UI; never auto-publishes a post; never auto-edits
the business name or address; never auto-creates a duplicate location.
All access is through this one official OAuth flow.
