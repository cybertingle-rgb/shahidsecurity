# Unified Architecture — Full Consolidation Project

**Status:** proposed architecture, Phase 2 of the consolidation project.
Read `PLATFORM_AUDIT.md` first — every decision here follows directly from
what that audit found, especially §6/§9/§10's resolved finding that
Hostinger has no hosting-level path-routing or reverse-proxy capability.
Nothing in this document has been built yet. This is the plan to approve,
not an action already taken, per Strict Development Rules 1–3 and 17–19.

---

## 1. The core decision: a thin routing gateway, not a merge

Three options were evaluated per the brief's §3:

| Option | What it means | Verdict |
|---|---|---|
| **A. Merge admin+LMS into one Next.js app, reverse-proxy Astro in** | Physically combine `apps/admin` and `apps/learn` codebases, then front the result with a proxy for the Astro static site | Rejected for now — highest engineering cost and risk (two independently-evolved codebases' routing, middleware, env vars, and build config all have to be reconciled at once) for a win (one process) that a much cheaper option also achieves |
| **B. Thin Next.js gateway, Multi-Zones rewrite to existing apps** | A new, small Next.js app takes over the apex domain's hosting slot. It serves the Astro site's static output directly, and uses Next.js's built-in [Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones) pattern — `next.config` `rewrites()` to an absolute URL — to transparently forward `/admin/*` to `admin.shahidiqbal.com` and `/learn/*` to `learn.shahidiqbal.com` over plain outbound HTTPS | **Recommended** |
| **C. Full monorepo/shared-packages rewrite** | Rebuild all three as one application from shared packages | Rejected — this is the "rewrite merely because it's easier to explain" the brief explicitly says not to default to; nothing about the current codebases requires it |

**Why B, concretely:**

- **It is the only option compatible with the actual hosting**, per the
  audit's resolved finding: Hostinger has no reverse-proxy or path-routing
  feature, and each existing site is already its own Node.js process on
  its own document root. Only an *application* can do the routing, and
  Next.js already has a first-class, supported pattern for exactly this
  (multiple independently-deployed Next.js apps, one acting as the public
  entry point) — no bespoke proxy code to write and maintain.
- **`apps/admin` and `apps/learn` do not change at all** — same codebase,
  same database, same deploy pipeline (`deploy-admin.yml`/`deploy-lms.yml`
  keep working exactly as they do today), same `admin.shahidiqbal.com`/
  `learn.shahidiqbal.com` endpoints (now called *internally*, by the
  gateway, rather than *directly*, by the browser). This directly satisfies
  Strict Rules 3, 4, 12, 13: nothing existing is removed, rewritten, or
  put at risk by this change.
- **The Astro site does not change either** — its own build stays exactly
  as it is; only *where* the built `dist/` is deployed to changes (into the
  new gateway app's `public/` directory instead of directly to the apex
  domain's document root via rsync).
- **It is reversible in one step**: if anything goes wrong, point the apex
  domain's deploy back at the old static-rsync workflow and the old
  subdomains keep working exactly as before, because they were never
  touched.
- **It directly produces real, browser-visible `/admin/*` and `/learn/*`
  URLs under `shahidiqbal.com`** — not a client-side redirect, not an
  iframe, a genuine same-origin path serving the real admin/LMS
  applications' real responses, which is what the brief's §2 and your
  own confirmed preference (path-based, not subdomain) require.

### What this does *not* solve by itself (named honestly, not hidden)

- **Single sign-on across admin and LMS** — the gateway only forwards
  requests; it does not share sessions. An admin visiting `/learn` as
  themselves still hits Learn's own, separate login. This is explicitly
  **out of scope for this phase** — see §4.
- **The duplicated LMS-admin UI (`apps/learn`'s own `/admin/*`)** — the
  gateway will forward to it exactly as it forwards to everything else
  under `/learn/*` unless specifically excluded. Retiring it in favor of
  `apps/admin`'s `/dashboard/learn/*` (your decision, audit §8/§10.3) is a
  **separate, later phase** — see §4.
- **Database consolidation** — not needed for this phase at all. The two
  databases stay exactly as they are; see §5.

---

## 2. Target architecture

```
                              Browser
                                 │
                                 ▼
                    https://shahidiqbal.com
                                 │
                 ┌───────────────────────────────┐
                 │   NEW: gateway app              │
                 │   (Next.js, apex domain's        │
                 │   existing Node.js hosting slot) │
                 │                                   │
                 │   /            → serves Astro's   │
                 │                  static dist/     │
                 │                  (unchanged build)│
                 │   /admin/*     → rewrite (HTTPS)  │
                 │   /learn/*     → rewrite (HTTPS)  │
                 └───────┬───────────────┬───────────┘
                         │               │
          outbound HTTPS │               │ outbound HTTPS
          (internal, not │               │ (internal, not
           user-visible) │               │  user-visible)
                         ▼               ▼
         admin.shahidiqbal.com   learn.shahidiqbal.com
         (apps/admin, unchanged) (apps/learn, unchanged)
                 │                       │
                 ▼                       ▼
         Admin MySQL DB          Learn MySQL DB
         (unchanged)             (unchanged)
                 ▲                       │
                 └──── learnDb.ts ───────┘
                 (existing bridge, unchanged)
```

The old subdomains keep resolving and keep serving real traffic throughout
— just internal, gateway-to-origin traffic instead of public, browser-to-origin
traffic, once DNS/public access to them is eventually restricted (Phase 9,
not now — see `SUBDOMAIN_RETIREMENT_CHECKLIST.md`, not yet written).

### 2.1 The gateway app, specifically

A new, minimal fourth codebase: `apps/gateway` (name open to your
preference). Responsibilities, deliberately kept small:

- Serve the Astro site's `dist/` output as static files for every path not
  claimed by a rewrite below (Next.js's own static file serving from
  `public/`, copied in at build time from the Astro build — the Astro
  build itself is completely unchanged).
- `next.config.mjs` `rewrites()`:
  ```js
  async rewrites() {
    return [
      { source: '/admin', destination: 'https://admin.shahidiqbal.com/admin' },
      { source: '/admin/:path*', destination: 'https://admin.shahidiqbal.com/admin/:path*' },
      { source: '/learn', destination: 'https://learn.shahidiqbal.com/learn' },
      { source: '/learn/:path*', destination: 'https://learn.shahidiqbal.com/learn/:path*' },
    ];
  }
  ```
  (Exact source/destination pairs depend on whether `apps/admin`/`apps/learn`
  are given a matching `basePath` — see §2.2 — which determines whether the
  rewrite target needs its own `/admin`/`/learn` prefix or not.)
- Nothing else. No business logic, no database connection, no auth of its
  own. The smaller this app stays, the less there is to get wrong in the
  one piece of new infrastructure this project introduces.

### 2.2 A real cost this option has, named plainly

Next.js Multi-Zones expects the *target* app to already know it's being
served under a path prefix, via its own `basePath` config — otherwise its
internal links, asset URLs (`/_next/...`), and `Set-Cookie` `Path`
attributes will be wrong once reached via `/admin/*` rather than directly.
Concretely, this means `apps/admin` needs `basePath: '/admin'` added to its
`next.config.mjs`, and `apps/learn` needs `basePath: '/learn'` — a real,
if small and mechanical, code change to each app (not a rewrite of either
app, just one config line plus auditing for any hardcoded absolute paths
like `NEXT_PUBLIC_APP_URL` that assume the app is served from `/`). Each
app **keeps working exactly as before when reached directly at its own
subdomain** during the transition (Next.js's `basePath` applies regardless
of which hostname requests arrive on), so this change is safe to make and
test well before the gateway exists or any DNS/traffic changes.

This is the one piece of real application-level work this phase requires,
and it is scoped, mechanical, and independently testable — not a rewrite.

---

## 3. Domain routing and deployment changes

- **Apex domain (`shahidiqbal.com`) deploy pipeline changes**: today,
  `.github/workflows/deploy.yml` builds Astro and rsyncs `dist/` straight to
  the document root. It becomes: build Astro (unchanged step) → build the
  new gateway app (`output: 'standalone'`, same pattern as admin/learn) →
  copy Astro's `dist/` into the gateway's `public/` → deploy the gateway the
  same way admin/learn already deploy (Hostinger's native Git pipeline +
  the build-info-polling GitHub Actions pattern already proven twice).
- **`apps/admin`/`apps/learn` deploy pipelines**: unchanged. They keep
  deploying to their own subdomains exactly as today; the gateway simply
  starts calling those same, already-live endpoints.
- **No DNS change, no new subdomain, no SSL change** in this phase. The
  apex domain's existing A/CNAME record and SSL certificate are untouched —
  only what Node.js code runs behind them changes. Strict Rules 14, 15
  fully respected.
- **No downtime is required for the cutover itself** if sequenced as: (1)
  ship `basePath` to admin/learn — zero visible change, their subdomains
  keep working identically; (2) build and deploy the gateway to a
  **staging** domain/path first (see §8) and verify `/admin/*`, `/learn/*`
  end-to-end there; (3) only then swap the apex domain's deploy target to
  the gateway. Worst case if something is wrong post-swap: redeploy the old
  static `dist/` to the apex domain directly (the original workflow still
  exists in git history) while the issue is fixed — a few minutes of the
  main site only, not admin or learn, which were never touched.

---

## 4. Explicitly sequenced as later, separate phases

Two pieces of the brief are real, agreed destinations but are **not**
part of this URL-consolidation phase, by design — bundling them in would
turn a low-risk, reversible change into a high-risk one for no added
benefit this phase needs:

1. **Retiring `apps/learn`'s own `/admin/*`** in favor of `apps/admin`'s
   `/dashboard/learn/*` (your decision, audit §10.3). **Re-checked
   2026-11-08, turned out simpler than planned**: `apps/admin`'s
   `/dashboard/learn/*` already has complete feature parity with
   `apps/learn/admin/*` — confirmed by diffing comparable files
   (`roadmap`, `communities`, `payment-methods`), not just comparing route
   names: same logic, same imports restructured to each app's own lib
   path, cosmetic text differences only — plus an entire extra section
   (`training-requests`, Personal Training) that `apps/learn`'s own panel
   never got. No porting work is needed. Acted on immediately rather than
   waiting: `apps/gateway/src/proxy.ts` now returns `404` for
   `/learn/admin` and everything under it, before the rewrite ever runs —
   confirmed directly (`/learn/admin/students` → `404`, while
   `/learn/courses` and `/admin/dashboard/learn/students` still attempt
   their normal proxy, unaffected). `apps/learn`'s own code is completely
   untouched — this is reversible by deleting one array entry in
   `proxy.ts`, no redeploy of `apps/learn` required, if a real gap is
   found later during a closer manual walkthrough (file-level diffing is
   strong evidence, not a full behavioral test).
2. **Shared/single sign-on between admin and LMS.** Out of scope for this
   phase because the two user bases barely overlap (admins vs. students) —
   the main person who'd benefit is you, logging into both. A lightweight
   option worth considering later: the gateway, once it exists, is a
   natural place to add a short-lived signed token exchanged between the
   two apps' login flows, without either app trusting the other's cookie
   directly. Not designed in detail here — flagging it as a real, deferred
   want, not a dropped requirement.

---

## 5. Database and auth — no change in this phase, and why that's correct

Per `PLATFORM_AUDIT.md` §3/§7, the two databases and two independent
session systems already satisfy the brief's hardest requirement — **"a
student must never access `/admin` simply by being authenticated"** — by
construction, because Learn's session cookie (`lws_session`) is never
checked by anything in `apps/admin`, and vice versa for `ssa_session`. The
gateway's rewrites are transparent at the HTTP level: each app still runs
its own, unchanged auth check on every request it receives, regardless of
whether the request arrived via its own subdomain or via the gateway. This
phase requires:

- **Zero schema changes.**
- **Zero data migration.**
- **Zero changes to RBAC, password hashing, or session logic in either app.**

This directly satisfies Strict Rules 5, 6, 9, 12 for this phase: nothing
about accounts, financial/enrollment records, RBAC, or the databases
themselves is touched by making the URLs path-based. `DATABASE_MIGRATION_PLAN.md`
is deferred until a phase that actually proposes a schema/data change is
scoped (none is, yet) — see audit §10.4's still-open payment-gateway
question, which is the most likely source of a real future migration need.

---

## 6. File/media storage — no change needed

Per audit §5, admin's uploaded files already live as DB blobs specifically
*because* this host wipes the app directory on every deploy. The gateway
introduces a fourth deployable app; it inherits the same constraint (if it
ever needs to store anything — current design in §2.1 has it store
nothing of its own) but doesn't change how admin or learn already handle
this. No action needed in this phase.

---

## 7. Security considerations specific to the gateway

- The gateway must not introduce a way to reach admin/learn routes that
  bypasses either app's own auth — since rewrites are transparent HTTP
  forwards (not a trust boundary the gateway asserts anything across), this
  holds by construction, but should be verified with a real test once
  built: an unauthenticated request to `/admin/dashboard` through the
  gateway must get exactly the same redirect-to-login response the direct
  subdomain gives today.
- Outbound rewrite targets must stay hardcoded to the real
  `admin.shahidiqbal.com`/`learn.shahidiqbal.com` HTTPS URLs — never
  user-influenced — so the gateway can never become an open SSRF relay.
- Once the gateway is live and verified, the natural next hardening step
  (Phase 9 territory, not now) is making `admin.shahidiqbal.com` and
  `learn.shahidiqbal.com` reachable only from the gateway's outbound IP
  (or another server-to-server auth header the gateway adds) rather than
  from the public internet at all — closing off the "old URL still works
  directly" surface once nothing legitimate depends on it. Named here so
  it's not forgotten, not actioned yet.
- `X-Forwarded-Host`/`X-Forwarded-Proto` handling: admin/learn's
  `NEXT_PUBLIC_APP_URL` and any absolute-URL generation (emails, OG tags,
  canonical links) need to keep resolving to `https://shahidiqbal.com/admin`
  or `/learn` once reached via the gateway, not fall back to their own
  subdomain — part of the `basePath` migration's testing checklist, not a
  new mechanism.

---

## 8. Staging

Per Strict Rule 19 and the brief's own phased-migration requirement,
`basePath` and the gateway get tested somewhere before touching
`shahidiqbal.com`'s real deploy target. Lowest-cost staging option on this
same Hostinger account: a throwaway fourth addon domain or subdomain
(e.g. a temporary `gateway-staging.shahidiqbal.com` or a free
`*.hostingersite.com`) pointed at the gateway app, rewriting to the real
`admin.shahidiqbal.com`/`learn.shahidiqbal.com` (safe — they're read the
same way regardless of who's calling) for full end-to-end verification
before the apex domain's deploy target ever changes.

---

## 9. Estimated phases (this architecture)

1. Add `basePath` to `apps/admin` and `apps/learn`; fix any hardcoded
   absolute-path assumptions; verify both apps still work identically at
   their current subdomains. Zero user-visible change.
2. Build the gateway app; deploy it to a staging domain; verify `/`,
   `/admin/*`, `/learn/*` end-to-end there, including auth, static assets,
   and cookies.
3. Switch the apex domain's deploy target to the gateway. Verify
   `shahidiqbal.com/`, `/admin`, `/learn` in production. Old subdomains
   still fully live and directly reachable throughout.
4. SEO/redirect work (`URL_REDIRECT_MAP.md`) — 301s from
   `admin.shahidiqbal.com/*` and `learn.shahidiqbal.com/*` to their
   `/admin/*`/`/learn/*` equivalents, so anyone/anything still hitting the
   old URLs directly lands correctly instead of just also working.
5. (Separate, later) LMS-admin-UI consolidation — §4.1.
6. (Separate, later, needs your sign-off per Strict Rule 19) Subdomain
   retirement — restrict public access once nothing depends on it anymore.

No phase here requires taking the existing site, admin panel, or LMS
offline.

---

## 9.1 Built and verified, 2026-11-08

The gateway app described in §2.1 exists now, at `apps/gateway`, and has
been built and run locally (not deployed — see §3 and the Strict
Development Rules). What was actually verified, end-to-end, against the
real production build of both the Astro site and the gateway, standing up
the compiled standalone server and sending it real requests:

- `/` and every Astro page (e.g. `/about/`) serve the real, current site
  content, byte-identical to the existing `dist/` build.
- **A real conflict, found and fixed**: Astro's `trailingSlash: 'always'`
  and admin/learn's own (default, no trailing slash) convention can't both
  be satisfied by Next's single global `trailingSlash` setting. Fixed with
  `skipTrailingSlashRedirect: true` plus a `src/proxy.ts` (this Next.js
  version's renamed `middleware.ts` — confirmed from this app's own
  `node_modules/next/dist/docs`, not assumed) that adds the trailing slash
  only for Astro-site paths, leaving `/admin/*` and `/learn/*` untouched.
  Without this fix, one choice of `trailingSlash` 308-redirects every Astro
  page needlessly; the other 308-redirects `/admin/dashboard` to
  `/admin/dashboard/` *before* the rewrite ever runs, which the real admin
  app (no trailing slash) would not resolve correctly.
- `/admin/*` and `/learn/*` rewrite to the configured destination with the
  path preserved exactly (`/admin/dashboard/users` arrives at the target
  as `/admin/dashboard/users`, not altered) — proven by pointing
  `ADMIN_APP_URL`/`LEARN_APP_URL` at two local mock servers at build time
  and confirming the exact path arrived. Confirmed separately that these
  env vars are read when `next build` runs, not at server start — the
  values must be set in the build environment, not only the runtime one.
- A 404 for an Astro-site path serves the Astro build's own `404.html`,
  not a generic Next error page.
- A path-traversal attempt (`..` segments) against the catch-all handler
  is rejected (resolved path checked against the astro-dist root before
  any file read) — confirmed directly, not just reasoned about.
- `next build` initially flagged `readFile`'s dynamic path as something
  that would make Turbopack trace (and bundle) this app's entire source
  tree into the standalone output; silenced correctly with a
  `turbopackIgnore` comment, since astro-dist/ is already guaranteed
  present by `flatten-standalone.mjs`'s own explicit copy step, the same
  convention admin/learn use for `public/`.

Not yet done: wiring this into the root deploy workflow, and deploying it
anywhere (staging included) — both come after you've reviewed this far.

## 10. Still open

- **`DATABASE_MIGRATION_PLAN.md` is not written yet** — correctly, since
  this architecture needs no database migration. It becomes relevant only
  if/when a real schema change is scoped (e.g., wiring an actual payment
  gateway, or the later LMS-admin-UI consolidation needing new fields).
- **`DEPLOYMENT_GUIDE.md`, `SECURITY_REVIEW.md`, `URL_REDIRECT_MAP.md`,
  `MIGRATION_VALIDATION_REPORT.md`, `SUBDOMAIN_RETIREMENT_CHECKLIST.md`** —
  not yet written; each follows once you've reviewed this architecture
  decision, per Section 19's own sequencing ("after the audit, proceed
  with safe, reversible development").
- Your sign-off on this architecture, specifically, before any of
  §9's phase 1 (`basePath` changes) is implemented.
