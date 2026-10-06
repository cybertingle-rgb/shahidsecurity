# Google Search Console integration

See `docs/GOOGLE_INTEGRATION_SETUP.md` for shared OAuth setup.

## Status: NEEDS_CONFIGURATION

Same situation as `docs/GOOGLE_ANALYTICS.md`: OAuth connect/disconnect
works (scope `webmasters.readonly`), verified by the same shared tests.

**Data sync is not built.** A Search Console account can have several
verified sites, so a site-picker step (via the Search Console API's
sites-list endpoint) is needed before reading any search performance
data, storing the choice in `search_console_connections.siteUrl`. Not
built. The `/dashboard/google` page says this plainly.

`search_console_connections` exists in the schema for that follow-up
work.
