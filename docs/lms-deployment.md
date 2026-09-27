# Learn with Shahid — Deployment & Migration Safety

**Status:** proposal. No infrastructure has been provisioned. Provisioning real hosting, a real database, or a real domain/DNS record is an infrastructure decision requiring your explicit approval, per the brief's own autonomous-agent rule — this document describes the plan to approve, not an action already taken.

## Environments

- **Local development**: the LMS app runs against a local Postgres instance (Docker or a local install) with seeded, entirely fake test data — never a copy of real student data.
- **Staging**: a full copy of the app + a separate database, used for testing migrations and payment sandbox flows before anything touches production. Given the brief's own "never run destructive migration automatically on production" and "test migration, test rollback" instructions, **staging is not optional** for this project. Staging's app process runs the same way production will (Hostinger Node.js App, see below) but against its own database and its own subdomain/path, never against the production database.
- **Production**: `learn.shahidiqbal.com`, real database, real (eventually) payment credentials — reached only after the Phase 12–14 security/performance/testing gates in `LMS_IMPLEMENTATION_PLAN.md` pass and you've signed off.

## Hosting recommendation (updated 2026-09-27 — needs your final confirmation, not a fresh choice, before provisioning)

**Superseded from the original Railway/Render recommendation.** You've already created the `learn.shahidiqbal.com` subdomain in Hostinger's hPanel (`/home/u397210942/domains/shahidiqbal.com/public_html/learn`) and chosen to run the Next.js app there via hPanel's "Setup Node.js App" feature, on the same hosting account as the existing site — recorded in `LMS_DECISIONS.md`'s addendum. This keeps the app process on Hostinger; **the database still comes from an external managed Postgres provider** (Hostinger shared plans don't offer Postgres — see `lms-architecture.md` §2's update note and `LMS_PRE_PHASE_2_REVIEW.md` §7). Before Phase 2 provisions anything, confirm in hPanel: the Node.js version(s) available, the app's memory/CPU limits, and that outbound HTTPS to the external database/email/payment APIs isn't blocked.

## The existing site is never at risk, by construction — with one caveat now worth naming

Because the LMS is a separate codebase, a separate deploy mechanism, and a separate directory/subdomain (`lms-architecture.md` §1), there is no scenario in this plan where an LMS deploy touches `shahidiqbal.com`'s `dist/`, `.htaccess`, the existing GitHub Actions workflow, or the existing site's own files. The only integration points are (a) new *static* pages added to the existing Astro codebase under `/learn/*`, which go through the exact same build/deploy/review process as any other page added this session, and (b) the `learn` subdomain, already created and mapped to its own directory — no change to the domain's other existing records.

**The one thing that's changed from the original "completely separate hosting relationship" framing**: the LMS app and the existing site now share one Hostinger account, so they share that account's overall resource ceiling (storage quota, concurrent-process limits) even though their directories, subdomains, and processes are separate. This is a real but low-probability risk at V1's expected scale — flagged in `LMS_PRE_PHASE_2_REVIEW.md` §8, not hidden — and worth revisiting if the LMS's traffic or storage footprint grows enough to matter.

## Database migration safety

- Every schema change is a reviewed, version-controlled migration file (Drizzle/Prisma migrations) — never a manual `ALTER TABLE` run by hand against production.
- Migrations run against staging first, with a rollback tested before the same migration ever runs against production.
- Destructive changes (dropping a column, dropping a table) require an explicit, separate approval step even after passing staging — the brief's "never run destructive migration automatically on production" rule is treated as absolute, not a default that can be overridden by a script flag.
- Automated backups (provided by the managed Postgres host) plus a documented manual "before this migration, take an extra snapshot" step for anything non-trivial.

## Pre-deployment checklist (every deploy, not just launch)

1. Tests pass.
2. Build succeeds.
3. TypeScript check passes.
4. Lint passes.
5. Pending migrations reviewed, tested against staging, rollback tested.
6. Environment variables for the target environment confirmed present and correct (no secret accidentally left unset, no staging key accidentally pointed at production).
7. Security configuration reviewed for anything changed this deploy (new route added? does it need a permission check? new upload type? does it need validation?).
8. Public routes spot-checked (nothing that should be public 404s; nothing that should be private is reachable unauthenticated).
9. Authentication flow smoke-tested (register → verify → login → logout).
10. Payment sandbox flow smoke-tested (never real credentials in staging).
11. Mobile UI spot-checked on the pages that changed.
12. SEO regression check (below) run against the static-site pages if any `/learn/*` marketing page changed.
13. A short deployment report written (what changed, what was tested, what to watch).

**Never deploy if the build fails. Never overwrite the production database blindly.**

## SEO regression checklist (specific to this project's stated risk)

Run this against the *existing* static site whenever a `/learn/*` page is added or changed there:

- Every existing pre-`/learn` URL still resolves exactly as before (spot-check the sitemap diff — it should only ever *gain* URLs, never lose or change an existing one, unless that's an intentional, separately-flagged change).
- No `/learn/*` static page accidentally ships without the canonical/OG/Twitter/breadcrumb metadata the rest of the site has.
- `/admin`, all student-private pages, and anything under `learn.shahidiqbal.com` are confirmed **not** indexable (blanket `noindex`/`X-Robots-Tag` per `lms-architecture.md` §6) — checked by actually fetching the page and reading the header/meta tag, not assumed from the code.
- `sitemap-index.xml` and `robots.txt` on the main site remain valid XML/plain-text and don't reference the LMS subdomain's private routes.
- The existing JSON-LD graph (`Organization`/`Person`/`WebSite`) is unaffected; any new `Course` schema validates independently and never introduces a duplicate or conflicting `@id`.

## Production security review (before any real payment credentials go live)

The full list from `lms-security.md`'s closing section — authentication, authorization, IDOR, CSRF, XSS, SQL injection, file upload, payment manipulation, webhook security, session security, admin access, rate limiting, secrets, dependencies, headers, error handling, privacy — run explicitly as a gate before Phase 7 (Payments) goes live with real credentials, not as a one-time setup task.

## What requires your explicit sign-off (repeating the brief's own rule, because it matters)

Production database migrations · activating real payment credentials · provisioning production secrets · DNS changes · server/hosting configuration · any destructive database change · deleting users or courses · pricing changes to a live product · the actual public launch · any change to a legal policy page. Everything else in the phased plan (audit, docs, schema design, tests, local development, UI work against local/staging data) can proceed without a separate approval each time, but each phase still ends with a report before moving to the next, per `LMS_IMPLEMENTATION_PLAN.md`.
