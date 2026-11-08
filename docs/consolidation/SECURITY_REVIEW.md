# Security Review — Full Consolidation Project

**Status:** covers the gateway app and the consolidation architecture as
built and verified so far (`docs/consolidation/UNIFIED_ARCHITECTURE.md`).
Does not re-audit `apps/admin`/`apps/learn`'s own internals from scratch —
`docs/ADMIN_SECURITY.md`, `docs/ADMIN_AUTH.md`, and `docs/lms-security.md`
already cover those in depth; this document's job is the delta this
project introduces, plus confirming the consolidation doesn't weaken
anything those existing reviews already established. Checklist items are
from the originating brief's §13.

## 1. Authentication

**Unaffected by this project.** Neither app's password hashing, session
creation, or login flow changed. The gateway has no login of its own and
never sees a password or credential — it forwards requests and returns
responses, nothing more (`UNIFIED_ARCHITECTURE.md` §2.1).

## 2. Authorization / RBAC / privilege escalation / student data isolation

**Holds by construction, confirmed by the architecture, not just asserted**:
rewrites are transparent HTTP forwards — each request still reaches
`apps/admin`/`apps/learn`'s own, completely unchanged auth middleware
first, regardless of whether it arrived via the gateway or the app's own
subdomain directly (`PLATFORM_AUDIT.md` §7). The gateway has no concept of
roles or permissions and makes no authorization decision of its own — it
cannot weaken RBAC because it is never consulted by it.

**One thing this review explicitly did not verify**: that an
unauthenticated request to a real protected route (e.g.
`/admin/dashboard`) proxied *through* the gateway gets back exactly the
same redirect-to-login response the direct subdomain gives today. The
architecture gives no reason this would differ (the proxied request is
byte-for-byte what a direct request would be, just via a different
network hop), but this should be an explicit smoke-test step before
cutover (`DEPLOYMENT_GUIDE.md` §4 step 5), not assumed from reasoning
alone.

## 3. Session handling

Unaffected in how sessions are created/validated. One real, new
consideration from Multi-Zones specifically: **cookies set by
`apps/admin`/`apps/learn` must remain valid for the path they're actually
served at.** Both apps set `path: '/'` on their session cookie
(`PLATFORM_AUDIT.md` §10, confirmed by reading `session.ts` in both apps)
— `/` is valid for every path under the browser's origin, `/admin/*`
included, so this needs no change. Confirmed by direct inspection of both
files, not assumed.

## 4. CSRF

Both apps' mutations go through Next.js Server Actions, which validate the
request's `Origin` header against the app's own expected host by default
— this is Next's own CSRF protection for Server Actions. Once requests
arrive via the gateway, the browser's `Origin` is `https://shahidiqbal.com`
(the page the user is actually on), which would **fail** that check
against `admin.shahidiqbal.com`'s own default expectation. Fixed already
(`UNIFIED_ARCHITECTURE.md` §2.2, done as part of Phase 1): both apps'
`next.config.mjs` now set `experimental.serverActions.allowedOrigins:
['shahidiqbal.com']` — additive only, each app's own origin keeps working
unchanged. **This is the one CSRF-relevant change this project makes, and
it only widens the allowlist to the one new legitimate origin, never
removes the existing check.**

## 5. XSS / SQL injection

Unaffected — the gateway renders no user input into HTML and runs no
database query at all (`UNIFIED_ARCHITECTURE.md` §2.1: no database
connection exists in this app). `apps/admin`/`apps/learn`'s own
Drizzle-ORM-parameterized queries and React's own escaping are untouched.

## 6. SSRF

The gateway's only outbound requests are the two rewrite destinations in
`next.config.mjs`, and they are **hardcoded** (read from
`ADMIN_APP_URL`/`LEARN_APP_URL` environment variables set by whoever
deploys it, never from request input) — a request can never influence
where the gateway forwards traffic. Confirmed by reading the actual
rewrite config: `source` patterns match request paths; `destination`
values are fixed strings built from env vars at build time, with no
request data interpolated into the *host* portion of either URL.

## 7. IDOR

Unaffected — the gateway has no concept of a resource ID; it is pure path
forwarding. `apps/admin`/`apps/learn`'s own IDOR posture on individual
routes (e.g. can a student fetch another student's record by guessing an
ID) is outside this project's delta and not re-audited here.

## 8. File upload security

Unaffected — the gateway accepts no file uploads. `apps/admin`'s own
upload allowlisting (content-type-based, UUID-renamed, 10MB-capped —
`PLATFORM_AUDIT.md` §5) is untouched.

**One new, gateway-specific file-serving risk, reviewed and closed**: the
catch-all route handler (`src/app/[[...slug]]/route.ts`) resolves a
request path to a file on disk — a classic directory-traversal surface if
done carelessly. Mitigated and **tested directly, not just reasoned
about**: every resolved path is re-verified (`path.resolve` +
`startsWith` check) to still be inside the `astro-dist/` root before any
read; a `..`-segment traversal attempt against the running standalone
server returned `404`, not a file outside that root
(`UNIFIED_ARCHITECTURE.md` §9.1).

## 9. API authorization / payment verification / webhook signatures

Unaffected — the gateway calls no payment or webhook API and makes no
authorization decision. `PLATFORM_AUDIT.md` §4's existing finding stands
unchanged: payments move to `succeeded` only via an explicit admin action
against verified evidence, enforced by `apps/learn`'s own schema/logic,
which this project does not touch.

## 10. Rate limiting

**Not implemented in the gateway, and not currently confirmed to exist in
either `apps/admin` or `apps/learn` either** — not found during the
Phase 1 audit, not re-derived here. This is a pre-existing gap, not one
this project introduces, but consolidating onto one public entry point
is a natural place to add it later (e.g. at the gateway, or via
Hostinger/Cloudflare-level rate limiting if available) — flagged as a
real, open recommendation, not actioned in this phase.

## 11. Sensitive data exposure / secrets management

The gateway is, by a meaningful margin, **the lowest-secret-surface app in
this project**: it holds no database credentials, no session secret, no
API keys of any kind — only two public URLs (`ADMIN_APP_URL`,
`LEARN_APP_URL`), which are not secrets (they're the same URLs anyone can
already type into a browser today). There is nothing in this app that
`.env`/credential-exposure concerns (brief §13's explicit callout) apply
to beyond the general "don't commit `.env`" hygiene already in
`apps/gateway/.gitignore`.

## 12. Database access

The gateway has no database connection of any kind (confirmed: no
Drizzle/mysql2 dependency in `apps/gateway/package.json`, unlike every
other app in this monorepo). It cannot weaken either database's access
posture because it has none.

## 13. Logging / audit logs

`apps/admin`'s insert-only `audit_logs` (enforced at the MySQL grant
level, `PLATFORM_AUDIT.md` §2.2) is untouched. The gateway adds no new
audit-relevant mutation of its own to log. Its own request logging is
whatever Next.js's standalone server emits by default — not extended in
this phase.

## 14. Residual risks and recommendations, honestly stated

- **Rate limiting** (§10) — real, pre-existing gap, worth addressing
  separately from this project.
- **The admin-bare-root behavior** (`URL_REDIRECT_MAP.md` §2) is still an
  open question, not a security issue by itself, but worth resolving
  before cutover so `/admin` doesn't surprise anyone with a 404.
- **This review has not re-run `apps/admin`/`apps/learn`'s own existing
  security test suites** (`tests/security.test.ts` per
  `ADMIN_ARCHITECTURE.md`) against the gateway-fronted setup — recommended
  as part of `MIGRATION_VALIDATION_REPORT.md`'s test run, once staging
  exists to run them against (`DEPLOYMENT_GUIDE.md` §4 step 3).
- **Once the gateway is live**, the natural next hardening step (explicitly
  deferred, not actioned, per `UNIFIED_ARCHITECTURE.md` §7) is restricting
  `admin.shahidiqbal.com`/`learn.shahidiqbal.com` to accept traffic only
  from the gateway, closing off direct access to the old URLs once nothing
  legitimate depends on them — this is `SUBDOMAIN_RETIREMENT_CHECKLIST.md`
  territory, sequenced well after cutover, not before.
