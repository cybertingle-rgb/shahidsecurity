# Google Analytics integration

See `docs/GOOGLE_INTEGRATION_SETUP.md` for shared OAuth setup.

## Status: Implemented

The property-picker gap this doc used to describe is closed. The flow,
same shape as Search Console's (`docs/GOOGLE_SEARCH_CONSOLE.md`):

1. **Connect** (Admin → Google → `analytics` row → Connect) — existing
   OAuth flow, `analytics.readonly` scope only (read-only; this app
   never writes to Analytics).
2. **Select a property** (`/dashboard/google/analytics`) — lists every
   GA4 account/property the authenticated Google account can access via
   the Analytics Admin API's `accountSummaries.list` (current,
   documented, non-deprecated). The admin picks one explicitly; nothing
   assumes the first or only result is correct.
3. **Test, then save** — the submitted property id is re-checked against
   the real accessible-properties list server-side, then a real minimal
   report query (Analytics Data API's `runReport`, requesting
   `activeUsers` for the last 7 days) confirms access. Only a successful
   query gets the selection — propertyId, propertyName, timezone,
   currency, all read from Google, never hard-coded — saved to
   `analytics_connections`.
4. **Data dashboard** — once selected, the same page shows a real
   top-pages table (page views + active users, last 28 days) labeled
   "Source: Google Analytics Data API". A failed report call shows an
   error, never a fallback number.

## What's not built yet

- Only one report (top pages by views/users, last 28 days) is wired into
  the UI. `runAnalyticsReport` (`src/lib/google/analytics.ts`) accepts
  arbitrary dimensions/metrics/date ranges, so more views (traffic
  sources, conversions, a date-range selector) are straightforward
  additions, not new plumbing.

## Required configuration (Shahid)

Same OAuth client as every other Google integration here:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
`TOKEN_ENCRYPTION_KEY` — see `docs/GOOGLE_INTEGRATION_SETUP.md`. The
Analytics Admin API and Analytics Data API both need enabling in the
same Google Cloud project (Google Cloud Console → APIs & Services →
Library) — standard enablement, no special approval or quota request.
