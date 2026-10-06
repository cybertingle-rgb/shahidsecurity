# Google Search Console integration

## Status: Implemented

This is the one Google integration fully working end-to-end at the code
level, because the Search Console API (v1, "Webmasters" API) supports
everything this needs with no special approval process:
`sites.list` to enumerate accessible properties, and
`searchanalytics.query` for real performance data. Both are current,
documented, non-deprecated endpoints.

## Flow

1. **Connect** (Admin → Google → `search_console` row → Connect) — the
   existing OAuth flow from Phase 9-12, requesting
   `https://www.googleapis.com/auth/webmasters.readonly` only (read-only;
   this app never modifies anything in Search Console).
2. **Select a property** (`/dashboard/google/search-console`) — lists
   every site the authenticated Google account can access via
   `sites.list`. The admin picks one explicitly; nothing assumes the
   first (or only) result is correct, per Phase 18J.
3. **Test, then save** — the submitted site is re-checked against the
   real accessible-sites list server-side (a tampered form value naming
   a site this account doesn't own is rejected), then a real, minimal
   Search Analytics query runs against it. Only a successful query gets
   the selection saved to `search_console_connections`. A failed test
   saves nothing and shows the real error.
4. **Performance dashboard** — once a property is selected, the same
   page shows real top-queries and top-pages tables for the last 28
   days, each row labeled "Source: Google Search Console API". No number
   on this page is invented; a failed API call shows an error, not a
   fallback number.
5. **SEO opportunities** — a simple, disclosed heuristic
   (`src/lib/google/seoOpportunities.ts`) flags pages with real,
   meaningful impression volume (≥50 in the period) whose actual CTR is
   less than half of what's typical for their average ranking position
   (an approximate, published industry CTR-by-position curve — not a
   Google-stated guarantee). Each flagged row shows real
   impressions/clicks/CTR/position and a plain note
   ("Potential title/meta description improvement — ..."). This never
   promises a ranking or traffic outcome, and never modifies anything —
   it only links to the SEO override editor (`/dashboard/seo/pages/new`)
   pre-filled with that page's path, pre-populated for review but not applied.

## What's not built yet

- **Date range selector.** The dashboard currently fixes the window to
  the last 28 days. Adding 7-day/3-month/6-month/12-month options is a
  small follow-up (the `querySearchAnalytics` function already accepts
  arbitrary `startDate`/`endDate`).
- **Country/device/date dimension breakdowns.** Only `query` and `page`
  dimensions are wired into the UI; the underlying function supports
  `country`, `device`, and `date` too.

## Required configuration (Shahid)

Same OAuth client as every other Google integration here:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
`TOKEN_ENCRYPTION_KEY` — see `docs/GOOGLE_INTEGRATION_SETUP.md`. Once set
and the OAuth consent screen is configured in Google Cloud Console with
the Search Console API enabled, this works without any further Google
Cloud approval — no quota request, no review process.
