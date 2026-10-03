# Learn with Shahid — Architecture Proposal

**Status:** proposal, not yet approved or built. Read `lms-architecture-audit.md` first — this document's recommendations follow directly from what that audit found (no existing backend, no database, static-only hosting).

## 1. The core decision: a separate application, not an extension of the static site

The existing site is a static Astro build with no server runtime. The LMS needs accounts, sessions, roles, a database, payment webhooks, background email jobs, and an admin application — none of which a static site generator can provide. Two options exist:

- **A. Build the LMS backend in raw PHP on the existing Hostinger shared hosting**, reusing the current hosting account.
- **B. Build the LMS as a separate application** (its own codebase, database, and hosting), reachable at a subdomain, linked from a handful of new static pages on the existing site.

**Recommendation: B.** Shared hosting has no persistent process model, no managed connection pooling, and no reliable background-job execution — all of which this brief explicitly requires (webhook handling, transactional email, drip-release schedules, live-class reminders) at a stated target of "thousands of students." Building that from scratch in raw PHP on shared hosting is possible but fights the platform the whole way, and directly risks the brief's own "secure, scalable, maintainable" requirement. Option B also has a decisive advantage the brief cares about most: **it makes "don't damage the existing site" true by construction**, not by careful discipline. The marketing site's build, deploy pipeline, CSP, and SEO infrastructure are completely untouched — the LMS is a different codebase, different deploy, different failure domain.

This is a real cost and ops decision (new hosting, new domain/subdomain DNS record), so per the brief's own autonomous-agent rule, **this recommendation needs your explicit sign-off before any infrastructure is provisioned.**

## 2. Recommended stack

| Layer | Recommendation | Why |
| --- | --- | --- |
| App framework | **Next.js (App Router), TypeScript** | Same language as the existing site (TypeScript), huge ecosystem for auth/payments/RBAC libraries, server + client rendering in one framework, easy to hand off to another developer later |
| ORM/migrations | **Drizzle ORM** | Type-safe queries, explicit migrations you can review before running, no auto-magic against production data |
| Auth | Hand-rolled server-side sessions (scrypt password hashing, `HttpOnly`/`Secure`/`SameSite=Lax` cookies) — no third-party auth library | Built and tested this session (`apps/learn/src/lib/auth/`) — scrypt is Node's own built-in (no native binary dependency, important given Hostinger's Node.js App hosting), and a dedicated auth library wasn't needed for what V1 requires |
| Background jobs (email sending, webhook retries) | Start with a simple DB-backed job queue; add **BullMQ + Redis** only once volume justifies it | V1 volume doesn't need a message broker; add it when it does, not before |
| Hosting | **Hostinger, via hPanel's "Setup Node.js App" feature** | You've already created the `learn.shahidiqbal.com` subdomain in hPanel (mapped to `/home/u397210942/domains/shahidiqbal.com/public_html/learn`), and chosen to run the app there rather than provision separate hosting — see `LMS_DECISIONS.md` addendum |
| Database | **MySQL** (updated 2026-09-27, see note below — supersedes the original PostgreSQL recommendation) | Hostinger shared hosting includes MySQL; you chose to consolidate everything onto your existing account rather than add an external Postgres provider. Fully rewritten, migrated, and tested (`apps/learn/src/db/schema/`) |
| Domain | `learn.shahidiqbal.com` (subdomain), already created in hPanel | Keeps the LMS clearly part of the Shahid Security brand, on the same hosting account as the existing site |
| Transactional email | A dedicated provider (e.g. Resend, Postmark, SES) — **not** the existing PHPMailer/SMTP setup | That setup is built for four low-volume contact-form emails, not verification/receipt/reminder volume at scale, and mixing marketing-site SMTP credentials into a new app is exactly the kind of cross-contamination worth avoiding |

> **2026-09-27 update — hosting decision changed from the original recommendation, then the database changed too.** This section originally recommended Railway or Render for a persistent Node process plus managed Postgres. You've since (1) created the `learn` subdomain in Hostinger's hPanel and chosen to run the Next.js app there via its Node.js App feature, and (2) chosen MySQL over an external Postgres provider so the database lives on the same Hostinger account too. Both are workable for V1, with real caveats:
> - **Confirm the plan actually has "Setup Node.js App" in hPanel** and which Node.js versions it offers — Next.js needs a reasonably current LTS (the app is built and tested against Node 22).
> - **MySQL needs `GRANT OPTION` on the admin database user to fully enforce `audit_logs` insert-only** — MySQL's privilege model is additive-only (no `REVOKE`-from-a-broader-grant the way Postgres allows), so making one table genuinely append-only requires a second, narrower database user provisioned via `apps/learn/src/db/apply-grants.ts`, which itself needs `GRANT OPTION` to create. **Not yet confirmed whether Hostinger's hPanel-issued MySQL user has this** — see `LMS_DECISIONS.md` addendum 2 (#36) and `apps/learn/README.md` for the fallback if it doesn't.
> - **Resource limits**: shared/Node-app hosting plans cap CPU/RAM/concurrent processes more tightly than a dedicated app host — fine for V1's expected traffic, worth re-checking before any real marketing push.
> - **Deploys are not zero-downtime** the way Railway/Render's are — an hPanel Node app restart briefly interrupts the app; acceptable for V1, flagged as a Phase 13 (performance) revisit item if it becomes a real issue.
> - **Shared account blast radius**: the LMS app, its database, and the existing static site now share one hosting account's overall resource ceiling — a traffic spike on one could theoretically affect account-wide limits. Low risk at V1 scale, worth monitoring rather than ignoring.
>
> Full detail in `LMS_DECISIONS.md`'s addenda and `LMS_PRE_PHASE_2_REVIEW.md`.

## 3. Route map (adapted from the brief to this architecture)

**On the existing static site (`shahidiqbal.com`, Astro, no auth, fully indexable):**

```
/learn                  — Learn with Shahid landing page
/learn/courses          — course catalog (static list, pulls from LMS-published data)
/learn/courses/[slug]   — individual course marketing page (syllabus, price, "Enroll" CTA -> LMS)
/learn/roadmap          — the interactive cybersecurity roadmap (see lms-roadmap.md)
/learn/pricing          — enrollment + course pricing, currency/country-aware (see §6)
/learn/instructors      — instructor bios
/learn/resources        — SEO content hub (see lms-roadmap.md's linking section)
/learn/faq              — FAQ page
```

These are genuinely static, SEO-critical pages. They inherit the existing site's schema graph, sitemap, robots.txt, and CSP for free — no new SEO infrastructure needed, just new content following the exact pattern already used for `services` and `caseStudies`.

**On the new LMS application (`learn.shahidiqbal.com`, Next.js, authenticated):**

```
/login  /register  /verify-email  /reset-password
/dashboard  /my-courses  /course/[slug]  /lesson/[id]
/progress  /certificates  /community  /profile  /settings  /billing

/admin  /admin/dashboard  /admin/students  /admin/courses  /admin/courses/new
/admin/courses/[id]  /admin/lessons  /admin/enrollments  /admin/payments
/admin/orders  /admin/memberships  /admin/communities  /admin/coupons
/admin/certificates  /admin/announcements  /admin/resources  /admin/analytics
/admin/reports  /admin/settings  /admin/users  /admin/roles  /admin/audit-logs
```

Every route in this block is `noindex` by default (see §6) and requires a valid session; `/admin/*` additionally requires an admin/super-admin role, checked server-side on every request — never inferred from a client-side flag.

## 4. How the two applications talk to each other

Kept deliberately simple for V1, to avoid building a fragile real-time sync layer before it's needed:

- **Course marketing content** (title, description, syllabus, instructor bio, thumbnail) is authored **in the LMS admin** as the source of truth, and the static site's `/learn/courses/[slug]` pages are generated from a **build-time fetch** to a small, public, read-only LMS API endpoint (e.g. `GET /api/public/courses`) — the same pattern Astro already uses for its content collections, just fed by an API instead of local MDX files. This means publishing a new course still requires a rebuild+redeploy of the marketing site, which is an acceptable, safe default (matches the brief's "never automatically publish without approval" instruction) — a "sync now" button in the admin can trigger the marketing site's deploy webhook once that's wanted.
- **Live pricing and enrollment status** (numbers that must never go stale, like "12 seats left" or country-specific price) are fetched **client-side, at page-load, directly from the LMS API** from within the static page — a small, CSP-allowlisted `connect-src` addition, not a rebuild dependency.
- **"Enroll" / "Login" buttons** on the static site simply link to `learn.shahidiqbal.com/register?course=<slug>` — no shared session, no cross-domain auth complexity in V1.

## 5. Design system continuity

"Learn with Shahid" must look like it belongs to Shahid Security, not a different company. Concretely: reuse the existing brand tokens (`#00BF63` green, dark background, Space Grotesk/Inter/JetBrains Mono type stack, the terminal/circuit visual language) as the LMS app's own Tailwind theme — copy the design tokens, not the components (the LMS is a different framework, so components are rebuilt, but the *values* — colors, fonts, spacing scale, the glass-card/corner-bracket motif — should be identical). The logo gets a small lockup variant: "SHAHID SECURITY" wordmark with a "LEARN" sub-mark, the same pattern used by companies running an education sub-brand (e.g. "Stripe" / "Stripe Press").

## 6. SEO architecture for the LMS

**Revision (2026-10): superseded on the indexable/never-indexed split below.** The course catalog and course detail pages moved from the static site into the LMS app itself (`learn.shahidiqbal.com/courses`, `/courses/[slug]`) as real, dynamic, login-aware pages — the "blanket noindex on the whole LMS subdomain" decision this section originally called for would have hidden them from Google entirely, which is backwards now that they're the primary public catalog. The actual, current split:

- **Indexable** (`apps/learn/src/app/robots.ts`, `sitemap.ts`): `/`, `/courses`, `/courses/[slug]`, `/login`, `/register` on `learn.shahidiqbal.com`, each with real `generateMetadata`/canonical/OG tags; plus `/learn`, `/learn/roadmap`, `/learn/pricing` on the static site as before.
- **Never indexed**: `/dashboard/*`, `/admin/*`, `/api/*`, and the token-bearing `/reset-password`/`/verify-email` pages — enforced three ways (an `X-Robots-Tag` header scoped to exactly those path prefixes in `next.config.mjs`, an explicit `robots: {index:false}` metadata export on each of those layouts, and `robots.ts`'s `disallow` list), not a blanket subdomain-wide header anymore.
- **Structured data**: `Course` schema on `/courses/[slug]` with fields that are genuinely true and visible on the page (name, description, provider, price where set). **No `AggregateRating`, no `review` fields, ever, unless real, disclosed ratings exist.** `FAQPage` schema on the homepage, from real, non-fabricated Q&A about how the platform actually works.
- **The static site's old `/learn/courses` catalog page was removed** (301-redirected to the real one) rather than left as a second, build-time-stale, duplicate-content source of the same listing.
- **Internal linking**: the content-cluster work already done this session (roadmap → course, article → course, service → article) extends naturally — `/learn/roadmap`'s stages link to `/blog/` articles and course pages; existing blog articles get a new "related course" slot where genuinely relevant (e.g. the IoT security article → a future IoT security course, once one exists — never a forced link to a course that doesn't exist yet).
- **Sitemap**: the static site's `@astrojs/sitemap` integration covers its own pages; `apps/learn`'s own `sitemap.ts` covers the homepage, catalog, and every published course URL, generated from real data — never a hardcoded list.

## 7. What this proposal deliberately leaves open

- **Which payment providers** — needs real research against current API docs, not assumed (`lms-payments.md`).
- **Whether Hostinger's MySQL user has `GRANT OPTION`** — determines whether `audit_logs` insert-only is enforced at the database level (the built and tested design) or falls back to application-level-only (see the update note in §2 and `LMS_DECISIONS.md` addendum 2).
- **Confirming Hostinger's Node.js App feature and resource limits** (see the update note in §2) before Phase 2 provisioning begins.

Everything from here (database schema, auth, payments, security, deployment) is detailed in the companion documents in this folder.
