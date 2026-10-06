# Google integration setup

## What's built, and what's genuinely untested

Everything in this document describes real, working code — verified against
real local infrastructure (a real MySQL database, a real AES-256-GCM
round-trip, and real outbound calls to Google's actual API endpoints that
correctly rejected a fake token with a genuine `401 UNAUTHENTICATED`). What
has **not** been tested is the live, end-to-end OAuth consent screen
handshake, because that requires a real `GOOGLE_CLIENT_ID`/
`GOOGLE_CLIENT_SECRET` pair from a Google Cloud Console project this session
has no access to create. Status: **NEEDS_CONFIGURATION**.

## Required environment variables

Set in `apps/admin`'s `.env` (local) or production secret store:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://admin.shahidiqbal.com/api/google/callback
TOKEN_ENCRYPTION_KEY=   # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

All four must be set before any "Connect" button on `/dashboard/google`
does anything — without them it renders disabled with a clear "not
configured" note (confirmed by test: this is the actual behavior, not a
description of intended behavior).

## Getting real credentials

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   reuse) a project for Shahid Security.
2. Enable the APIs this integration actually calls: **My Business Account
   Management API** and **My Business Business Information API** (Business
   Profile), **Google Analytics Data/Admin API** (Analytics), and
   **Search Console API**.
3. Under APIs & Services → Credentials, create an **OAuth 2.0 Client ID**
   (type: Web application).
4. Add `GOOGLE_REDIRECT_URI`'s exact value as an authorized redirect URI.
5. Copy the generated Client ID and Client Secret into the environment
   variables above.
6. The first real connection attempt needs an account that's an owner/manager
   of the actual Shahid Security Google Business Profile — Google will show
   its own consent screen for that account to grant access.

## What's actually implemented per integration

### Google Business Profile — architecture complete, data sync partial

- `/api/google/connect/business_profile` → `/api/google/callback`: full
  OAuth 2.0 authorization-code flow with `access_type=offline` (so a
  refresh_token is actually returned) and CSRF-safe state verification via
  an httpOnly cookie.
- Tokens are AES-256-GCM encrypted before being stored
  (`src/lib/crypto.ts`) — verified with a real encrypt/decrypt round-trip
  against a locally generated key; the admin UI only ever shows the
  connected Google account's email and last-synced time, never a token.
- "Sync now" (`src/lib/google/businessProfile.ts`) calls the real Business
  Profile Account Management and Business Information APIs and caches the
  connected location's real name/ID. **Rating and review count are not yet
  populated** — the Business Information API doesn't return those; a real
  implementation needs the Business Profile Performance API or the legacy
  My Business API v4's reviews resource, deliberately not guessed at
  without being able to verify the actual response shape against live data.
- Disconnecting genuinely clears the encrypted token columns in
  `google_connections`, confirmed directly in the database after a real
  disconnect — not just a status flag flip.

### Google Analytics / Google Search Console — connect works, data sync not built

The same generic OAuth connect/callback/disconnect routes handle all three
scope names, so connecting an account for Analytics or Search Console
works identically to Business Profile. What's missing, and why it's a
materially larger task than Business Profile's case: a Google account can
have several GA4 properties or several Search Console sites, so after
connecting, a required second step — listing the account's available
properties/sites via the Admin API and letting the admin pick the right
one — has to happen before any actual traffic/search data can be fetched.
That selection UI and the subsequent data-fetch functions are not yet
built. The dashboard says this plainly rather than implying it works.

## Audit logging

Every connect, disconnect, sync success, and sync failure writes to
`audit_logs` — confirmed in testing, including a real failure case (a
sync attempt against a fake token produced a real `401 UNAUTHENTICATED`
from Google, caught and logged with the actual error message, never a
token value).

## Status summary

| Integration | OAuth connect/disconnect | Data sync | Status |
|---|---|---|---|
| Business Profile | Built, needs real credentials to live-test | Location name/ID only; rating/reviews not implemented | NEEDS_CONFIGURATION |
| Analytics | Built, needs real credentials to live-test | Not built (needs property picker) | NEEDS_CONFIGURATION |
| Search Console | Built, needs real credentials to live-test | Not built (needs site picker) | NEEDS_CONFIGURATION |
