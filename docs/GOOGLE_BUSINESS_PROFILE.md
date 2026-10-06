# Google Business Profile integration

See `docs/GOOGLE_INTEGRATION_SETUP.md` for shared OAuth setup, required
environment variables, and getting real credentials — this doc covers
what's specific to Business Profile.

## Status: NEEDS_CONFIGURATION

Architecture-complete, live-untested (no real Google Cloud credentials
available to this session). What's real and verified:

- OAuth connect/disconnect at `/dashboard/google`, scope
  `business.manage` (minimum necessary for this use).
- "Sync now" (`src/lib/google/businessProfile.ts`) calls the real
  Account Management and Business Information APIs and caches the
  connected location's real name and Google-assigned location ID in
  `google_business_profiles`.
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

## Never-do list (unaffected by any of the above)

This integration only ever reads what Google's API returns. It never
creates, edits, or responds to a review; never fabricates review
activity; never scrapes Google search results or automates the
Business Profile web UI. All access is through this one official OAuth
flow.
