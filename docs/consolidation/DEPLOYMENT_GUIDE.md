# Deployment Guide — Full Consolidation Project

**Status:** plan for deploying `apps/gateway` (the new app built in
`docs/consolidation/UNIFIED_ARCHITECTURE.md` §2.1). Nothing in this
document has been provisioned or deployed. Per this project's Strict
Development Rules, deployment — staging included — needs your explicit
go-ahead; this is the guide to follow once given.

## 1. What actually changes on Hostinger

Only **one** thing: the apex domain's (`shahidiqbal.com`) existing
Node.js-hosted website gets a new application deployed to its hosting slot
— the gateway — instead of the current plain static rsync.

- **`admin.shahidiqbal.com` and `learn.shahidiqbal.com` are not
  reconfigured at all.** Same Hostinger website entries, same Node.js
  apps, same databases, same deploy pipelines
  (`deploy-admin.yml`/`deploy-lms.yml`), same env vars. They simply start
  receiving some of their traffic from the gateway (server-to-server)
  instead of only directly from browsers.
- **No new DNS record.** `shahidiqbal.com`'s existing A/CNAME record and
  SSL certificate are untouched (`PLATFORM_AUDIT.md` §6, `UNIFIED_ARCHITECTURE.md`
  §3) — only the Node.js process behind them changes.
- **No new subdomain, no new SSL certificate to provision.**

## 2. Hostinger configuration for the apex domain

Per `hosting_websites_list`'s confirmed live state
(`PLATFORM_AUDIT.md` §6), `shahidiqbal.com` is already flagged
`website_type: "nodejs"` by Hostinger despite currently serving static
files — meaning a Node.js App configuration for this domain may already
exist, unused, in hPanel ("Setup Node.js App"). Whoever provisions this
needs to check hPanel directly rather than assume either way. Either way,
the settings needed are:

- **Application root**: `apps/gateway` (relative to the repo checkout).
- **Application startup file**: `server.js` (the flattened standalone
  output — `apps/gateway/scripts/flatten-standalone.mjs` ensures
  `.next/standalone/server.js` is self-contained, same convention as
  admin/learn).
- **Build command** — this is the one genuinely new wrinkle versus
  admin/learn's deploy: the gateway's own build needs the **Astro site's**
  build output to already exist at the repo root (`dist/`) before it runs
  `scripts/copy-astro-dist.mjs`. If Hostinger's build step runs scoped to
  `apps/gateway` only (as it does for admin/learn today), it will not
  build the Astro site first. The build command for this app must do
  both, e.g. (exact syntax depends on what Hostinger's panel accepts for
  this field — confirm when configuring, same caveat `docs/DEPLOYMENT.md`
  flagged for admin's own setup):
  ```
  cd ../.. && pnpm install && pnpm build && cd apps/gateway && pnpm install && pnpm build
  ```
  If Hostinger's Node.js App product doesn't accept a multi-step/`cd`
  build command, the fallback is a GitHub Actions workflow that builds
  both and deploys the result via SSH/rsync (the same pattern the Astro
  site itself already uses in `.github/workflows/deploy.yml`) instead of
  relying on Hostinger's native Git pipeline for this one app — noted as
  option B below.
- **Node.js version**: match whatever admin/learn already use successfully
  (confirm in hPanel; not re-derived here).

## 3. Environment variables

Set on the Node.js App itself (Hostinger's "Environment variables" screen
for this app — these affect the **build**, since `next.config.mjs` reads
them at build time, not just runtime; see
`UNIFIED_ARCHITECTURE.md` §9.1's note that this was confirmed directly
while testing):

```
ADMIN_APP_URL=https://admin.shahidiqbal.com
LEARN_APP_URL=https://learn.shahidiqbal.com
NODE_ENV=production
```

Both have safe defaults already baked into `next.config.mjs` matching
these exact values (`apps/gateway/.env.example`), so omitting them is not
dangerous — but set them explicitly anyway, so a future change to either
subdomain's URL is a one-line env var edit, not a code change.

**Staging**: override `ADMIN_APP_URL`/`LEARN_APP_URL` to point at the
*same, real* `admin.shahidiqbal.com`/`learn.shahidiqbal.com` (reading
their real data is safe — the gateway only ever issues plain GET/POST
proxies, never a destructive call of its own) when testing the gateway
itself on a throwaway staging domain, per `UNIFIED_ARCHITECTURE.md` §8.

## 4. Deployment steps, when authorized

1. Confirm hPanel's Node.js App configuration for `shahidiqbal.com` (§2) —
   create it if it doesn't exist as a real, usable config; reconfigure if
   it exists but points at the old static setup.
2. Set the environment variables (§3).
3. **First, deploy to a staging domain** (`UNIFIED_ARCHITECTURE.md` §8) —
   a throwaway addon domain or subdomain, never the apex domain itself —
   and verify:
   - `/` and a sample of Astro pages serve correctly, with the right
     trailing slash behavior (no unwanted redirects — this was the real
     bug found and fixed in `UNIFIED_ARCHITECTURE.md` §9.1).
   - `/admin` and `/learn` genuinely reach the real admin/learn apps
     (login works, a session survives a page navigation, static assets
     under `/admin/_next/*` and `/learn/_next/*` load).
   - A 404 on an Astro-site path serves the Astro build's own 404 page.
4. Only once staging is verified: point the apex domain's deploy at the
   gateway instead of the current static rsync. This is the one
   production-visible change in the entire cutover — everything else
   (admin, learn, their databases) is unaffected by it.
5. Smoke-test production immediately after: `/`, `/admin/login`,
   `/learn/login`, one real course page, one real admin dashboard page.
6. Keep the old static-rsync `deploy.yml` workflow available (git history
   already has it) in case of rollback — reverting is "redeploy the old
   static output," not a multi-step unwind.

## 5. CI workflow

A new workflow, `.github/workflows/deploy-gateway.yml`, is scaffolded
alongside this guide — modeled on `deploy-admin.yml`/`deploy-lms.yml`'s
proven build-info-polling pattern, adapted for the gateway's own needs
(no database, so no migrate step; a smoke test instead). It is **currently
inert**: scoped to trigger only on pushes to this project's own feature
branch, not the production branch, and documented as needing its secrets
configured before it does anything real — same starting state
`docs/DEPLOYMENT.md` honestly recorded for `deploy-admin.yml` when it was
first written. Wiring it to the actual production branch is part of §4
step 4 above, not before.

## 6. Monitoring

- `apps/gateway/public/build-info.json` (written by
  `scripts/write-build-info.mjs`, same convention as admin/learn) lets any
  future workflow or manual check confirm which commit is actually live.
- No new error-tracking/logging system is introduced — the gateway has no
  business logic to log beyond what Next.js's own request logging already
  gives you. If a request fails to proxy (e.g. the real incident this
  guide's testing reproduced on purpose: `getaddrinfo ENOTFOUND` when a
  target host is unreachable), it surfaces as a `500` from the gateway and
  should be monitored the same way any other `5xx` on the site would be.

## 7. What this guide deliberately does not cover

- `SECURITY_REVIEW.md` (separate document) — the security posture of the
  gateway itself and of the consolidated routing.
- Retiring the old subdomains (`SUBDOMAIN_RETIREMENT_CHECKLIST.md`, not
  yet written) — explicitly a separate, later, your-approval-gated step.
