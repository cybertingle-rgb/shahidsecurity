# Google Analytics integration

See `docs/GOOGLE_INTEGRATION_SETUP.md` for shared OAuth setup.

## Status: NEEDS_CONFIGURATION

OAuth connect/disconnect works today (the same generic routes
Business Profile uses, with the `analytics.readonly` scope) — verified
by the same connect/disconnect/encryption tests as the other two
integrations, since the OAuth plumbing is shared and scope-agnostic.

**Data sync is not built.** A GA4 account can have multiple properties,
so before any traffic data can be read, a required step — listing the
account's available properties via the Analytics Admin API and letting
the admin pick the right one, then storing that choice in
`analytics_connections.propertyId` — has to exist first. That picker UI
and the subsequent Analytics Data API query functions aren't written.
The `/dashboard/google` page says this plainly rather than implying
Analytics data is already flowing.

`analytics_connections` exists in the schema, ready for that follow-up
work without a schema change.
