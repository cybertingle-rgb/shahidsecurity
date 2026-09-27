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
| Database | **PostgreSQL** | Relational integrity matters here (enrollments, payments, RBAC) far more than document flexibility; every recommended provider below offers managed Postgres |
| ORM/migrations | **Drizzle ORM** (or Prisma — either is fine; Drizzle is lighter and SQL-closer) | Type-safe queries, explicit migrations you can review before running, no auto-magic against production data |
| Auth | A dedicated auth library (e.g. **Lucia** or **Auth.js**) rather than hand-rolled sessions | Password hashing, session management, and CSRF handling are exactly the kind of code a security-focused business shouldn't reinvent |
| Background jobs (email sending, webhook retries) | Start with a simple DB-backed job queue; add **BullMQ + Redis** only once volume justifies it | V1 volume doesn't need a message broker; add it when it does, not before |
| Hosting | **Hostinger, via hPanel's "Setup Node.js App" feature** — updated 2026-09-27, see note below | You've already created the `learn.shahidiqbal.com` subdomain in hPanel (mapped to `/home/u397210942/domains/shahidiqbal.com/public_html/learn`), and chosen to run the app there rather than provision separate hosting — see `LMS_DECISIONS.md` addendum |
| Database | **PostgreSQL, from an external managed provider** (e.g. Neon, Supabase, or a database-only plan from Railway/Render/Aiven/ElephantSQL) | Hostinger shared hosting plans provide MySQL/MariaDB, not Postgres, so the database can't live on the same account as the app process — `DATABASE_URL` just needs to be reachable over the internet with TLS, which works from any host, including a Hostinger Node.js app |
| Domain | `learn.shahidiqbal.com` (subdomain), already created in hPanel | Keeps the LMS clearly part of the Shahid Security brand, on the same hosting account as the existing site |

> **2026-09-27 update — hosting decision changed from the original recommendation.** This section originally recommended Railway or Render specifically to get a persistent Node process, managed Postgres, and background-job support in one place, because shared hosting historically lacked all three. You've since created the `learn` subdomain in Hostinger's hPanel and decided to run the Next.js app there via its Node.js App feature (LiteSpeed's Node.js Selector/Passenger), keeping everything on one hosting account. This is workable for V1's scope, with caveats that need verifying before Phase 2 provisioning, not assumed:
> - **Confirm the plan actually has "Setup Node.js App" in hPanel** and which Node.js versions it offers — Next.js needs a reasonably current LTS (18.17+ or later depending on the exact Next.js version chosen).
> - **Postgres still comes from elsewhere** (see the Database row above) — this was already true of every hosting option, but it's worth restating since "run it on Hostinger" doesn't mean "the database is on Hostinger too."
> - **Resource limits**: shared/Node-app hosting plans cap CPU/RAM/concurrent processes more tightly than a dedicated app host — fine for V1's expected traffic, worth re-checking before any real marketing push.
> - **Deploys are not zero-downtime** the way Railway/Render's are — an hPanel Node app restart briefly interrupts the app; acceptable for V1, flagged as a Phase 13 (performance) revisit item if it becomes a real issue.
> - **Outbound connections**: the app needs outbound HTTPS to the external Postgres provider, the email provider, and the payment provider's API — confirm the hosting plan doesn't block outbound traffic on the ports/hosts those services need, before Phase 2 begins.
> - **Shared account blast radius**: the LMS app and the existing static site now share one hosting account's overall resource ceiling (even though they're separate subdomains/directories/processes) — a traffic spike on one could theoretically affect account-wide limits. Low risk at V1 scale, worth monitoring rather than ignoring.
>
> Full detail in `LMS_DECISIONS.md`'s addendum and `LMS_PRE_PHASE_2_REVIEW.md`.
| Transactional email | A dedicated provider (e.g. Resend, Postmark, SES) — **not** the existing PHPMailer/SMTP setup | That setup is built for four low-volume contact-form emails, not verification/receipt/reminder volume at scale, and mixing marketing-site SMTP credentials into a new app is exactly the kind of cross-contamination worth avoiding |

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

- **Indexable**: `/learn`, `/learn/courses`, `/learn/courses/[slug]`, `/learn/roadmap`, `/learn/pricing`, `/learn/instructors`, `/learn/resources` (+ its sub-articles), `/learn/faq`. Each gets a unique title, meta description, canonical, OG/Twitter tags, and breadcrumbs, following the exact `BaseLayout.astro` pattern already in use — these pages live in the Astro codebase, so they use the same `pageTitle()`/`schema.ts` helpers as every other page.
- **Structured data**: `Course` schema on `/learn/courses/[slug]` **only** with fields that are genuinely true and visible on the page (name, description, provider linked to the existing `#organization` `@id`, real instructor). **No `AggregateRating`, no `review` fields, ever, unless real, disclosed ratings exist** — the brief is explicit about this and it matches the existing site's no-fabrication standard.
- **Never indexed**: everything under `learn.shahidiqbal.com` except the handful of pages that might eventually live there too — in practice, since all indexable content lives on the *static* site per §3, the entire LMS subdomain can carry a blanket `X-Robots-Tag: noindex` at the server level, which is simpler and safer than remembering per-page `noindex` meta tags across a growing admin surface.
- **Internal linking**: the content-cluster work already done this session (roadmap → course, article → course, service → article) extends naturally — `/learn/roadmap`'s stages link to `/blog/` articles and `/learn/courses/[slug]` pages; existing blog articles get a new "related course" slot where genuinely relevant (e.g. the IoT security article → a future IoT security course, once one exists — never a forced link to a course that doesn't exist yet).
- **Sitemap**: the existing `@astrojs/sitemap` integration already used by the marketing site picks up the new static `/learn/*` pages automatically, the same way it picked up the 10 new blog posts. No new sitemap mechanism needed.

## 7. What this proposal deliberately leaves open

- **Which payment providers** — needs real research against current API docs, not assumed (`lms-payments.md`).
- **Which external Postgres provider** — Neon, Supabase, and a database-only Railway/Render/Aiven/ElephantSQL plan are all workable; picking one is a real comparison (free-tier limits, backup policy, connection-pooling support for a Node app on shared hosting) worth doing right before Phase 2 provisioning, not assumed here.
- **Confirming Hostinger's Node.js App feature and resource limits** (see the update note in §2) before Phase 2 provisioning begins — this is now the load-bearing hosting decision instead of Railway/Render.

Everything from here (database schema, auth, payments, security, deployment) is detailed in the companion documents in this folder.
