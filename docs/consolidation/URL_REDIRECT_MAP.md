# URL Redirect Map — Full Consolidation Project

**Status:** plan, not yet implemented anywhere. Covers the redirects needed
once the gateway app (`docs/consolidation/UNIFIED_ARCHITECTURE.md`) is
actually deployed and the apex domain starts serving `/admin/*` and
`/learn/*` — not before. No redirect described here exists in production
yet.

## 1. The rule, not a 1:1 table

Because `apps/admin` and `apps/learn` were each given a `basePath` that
exactly matches their new location (`/admin`, `/learn` —
`docs/consolidation/UNIFIED_ARCHITECTURE.md` §2.2), every existing route in
each app maps to the new domain by a single, mechanical rule — not a
hand-maintained table that drifts out of date as routes are added:

```
https://admin.shahidiqbal.com/<path>  →  https://shahidiqbal.com/admin/<path>
https://learn.shahidiqbal.com/<path>  →  https://shahidiqbal.com/learn/<path>
```

This covers all 65 of `apps/admin`'s current routes and all 41 of
`apps/learn`'s (`docs/consolidation/PLATFORM_AUDIT.md` §2.2/§2.3) without
enumerating them, and — critically — it still covers every route either
app adds *after* this document is written, which a static table would not.

Examples (real, current routes, not illustrative placeholders):

| Old | New |
|---|---|
| `https://admin.shahidiqbal.com/dashboard/learn/courses` | `https://shahidiqbal.com/admin/dashboard/learn/courses` |
| `https://admin.shahidiqbal.com/login` | `https://shahidiqbal.com/admin/login` |
| `https://learn.shahidiqbal.com/courses/intro-to-pentesting` | `https://shahidiqbal.com/learn/courses/intro-to-pentesting` |
| `https://learn.shahidiqbal.com/dashboard/checkout/<id>` | `https://shahidiqbal.com/learn/dashboard/checkout/<id>` |

## 2. One real exception: each app's own root

`apps/admin`'s root route is `/dashboard` (there is no page at admin's
bare `/`); `apps/learn`'s root route genuinely is `/` (its homepage). Once
`basePath` applies:

| Old | New |
|---|---|
| `https://admin.shahidiqbal.com/` | `https://shahidiqbal.com/admin` *(or `/admin/dashboard` directly — confirm which once the gateway is live; `/admin` itself may 404 if nothing renders at that exact basePath root)* |
| `https://learn.shahidiqbal.com/` | `https://shahidiqbal.com/learn` |

Flagged as "confirm once live" rather than asserted, since it depends on
whether `apps/admin` has a page component at its own bare root once
`basePath` is applied — not verified in this pass.

## 3. Implementation: where these redirects actually live

Per the brief's §12 ("do not redirect every old URL to the homepage" — this
plan doesn't), these are implemented as **301s issued by
`admin.shahidiqbal.com` and `learn.shahidiqbal.com` themselves**, not by
the gateway (the gateway has no reason to ever see traffic to the old
subdomains — it only receives traffic sent to `shahidiqbal.com`). Concretely,
once the gateway is live and verified (`UNIFIED_ARCHITECTURE.md` §9 phase
3), each app's own `next.config.mjs` gets a `redirects()` rule:

```js
async redirects() {
  return [
    { source: '/:path*', destination: 'https://shahidiqbal.com/admin/:path*', permanent: true },
  ];
}
```

(the equivalent for `apps/learn`, pointing at `/learn/:path*`). This keeps
the redirect logic in the app that already owns those URLs, rather than
adding old-domain-awareness to the new gateway, and is a clean, reversible,
one-line-per-app change — not implemented yet; sequenced after the cutover
is verified, exactly where `UNIFIED_ARCHITECTURE.md` §9 phase 4 places it.

## 4. SEO preservation (brief §12)

- **Canonical tags, OG tags, structured data, meta descriptions**: neither
  `apps/admin` (fully noindexed already, audit §2.2) nor `apps/learn`'s
  private routes need any change here. `apps/learn`'s genuinely public,
  indexed pages (`/`, `/courses`, `/courses/[slug]`, `/login`, `/register`
  — `PLATFORM_AUDIT.md` §2.3) generate their canonical/OG URLs from
  `env.NEXT_PUBLIC_APP_URL` (confirmed directly in `sitemap.ts`, same
  pattern elsewhere) — once that env var is updated to
  `https://shahidiqbal.com/learn` at cutover time, every generated
  canonical/OG/sitemap URL updates correctly with **zero code change**.
  This is the one env var that actually matters for SEO continuity and
  must be set correctly before cutover, not left at its old subdomain
  value.
- **The Astro site's own URLs do not change at all** — `/`, `/about/`,
  `/services/*`, `/blog/*`, etc. keep their exact existing paths. Nothing
  in this project touches them (`UNIFIED_ARCHITECTURE.md` §1).
- **Google Search Console / GA4 property configuration** (brief §12's
  explicit callout) — both currently configured against the subdomains'
  own properties (per `docs/GOOGLE_INTEGRATION_SETUP.md`). Needs a new
  Search Console property for the consolidated `shahidiqbal.com/admin` and
  `/learn` paths (Search Console tracks by domain+path prefix, not
  automatically), or confirmation that the existing `shahidiqbal.com`
  property already covers them once DNS/serving changes — not resolved in
  this pass, flagged for the cutover phase, not blocking the architecture
  decision.
- **OAuth redirect URIs** (`GOOGLE_REDIRECT_URI` in `apps/admin`,
  `apps/learn`'s own Google login callback) — these are registered with
  Google's own console against the *old* subdomain URL today. They must be
  **added** (not switched — keep the old one registered until the old
  subdomain is actually retired, so a mid-migration login doesn't break)
  as a second valid redirect URI pointing at
  `https://shahidiqbal.com/admin/api/google/connect/...` /
  `https://shahidiqbal.com/learn/api/auth/google/callback` before cutover,
  per `UNIFIED_ARCHITECTURE.md`'s "no downtime required" sequencing.

## 5. Payment gateway / webhook callback URLs

Per `PLATFORM_AUDIT.md` §4, no online payment gateway was confirmed wired
anywhere in either app as of this audit — if one exists but wasn't found,
or is added later, any registered webhook callback URL for it needs the
same "add the new URL before retiring the old one" treatment as the OAuth
redirect URIs above. Flagged, not actioned — this audit could not confirm
whether any such webhook exists.

## 6. What this document does not cover yet

- The actual `redirects()` code change (§3) — not written, sequenced after
  cutover verification per `UNIFIED_ARCHITECTURE.md` §9.
- Confirming admin's bare-root behavior (§2).
- Search Console / GA4 property reconciliation (§4) — needs your input on
  which Google account/property owns this, not purely a code question.
