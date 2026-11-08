# Platform Audit — Full Consolidation Project

**Status:** Phase 1 (Discovery & Audit) deliverable. Read-only investigation —
no application code changed, no database touched, no deployment or DNS
action taken. Produced on branch `claude/platform-consolidation-audit`
(created off `claude/wizardly-keller-yg0bj7`), per the project's rule to use
a dedicated feature branch and never push audit/consolidation work directly
to the branch that auto-deploys to production.

This document is the ground truth for the consolidation project going
forward. Where it disagrees with an existing `docs/*.md` file, that file is
stale — several `docs/` files are explicitly dated proposals that were later
superseded (sometimes by a later note in the same file, sometimes by a
different file entirely) and were not reconciled with each other. Every
claim below was checked against the live code, the live Hostinger panel, or
live GitHub Actions run history as of 2026-11-08, not assumed from a doc.

---

## 1. Executive summary

Three separately deployed applications currently make up "shahidiqbal.com":

| App | Domain (live) | Stack | Status |
|---|---|---|---|
| Main site | `shahidiqbal.com` | Astro 7 static site | Live, static-hosted, deployed by GitHub Actions (plain rsync of `dist/`) |
| Admin panel | `admin.shahidiqbal.com` | Next.js 16 (standalone) | Live — confirmed by a successful `deploy-admin.yml` run on 2026-11-06 (run #76). `docs/DEPLOYMENT.md`'s claim that it "has never successfully deployed anywhere" is from 2026-10-06 and is now stale. |
| LMS ("Learn with Shahid") | `learn.shahidiqbal.com` | Next.js 16 (standalone) | Live — confirmed by a successful `deploy-lms.yml` run on the same commit, same day. |

All three are registered in the Hostinger account as separate **addon
domains** (`vhost_type: "addon"`), each independently flagged
`website_type: "nodejs"` by Hostinger (including the main site, even though
it is actually deployed as static files — see §6). `shahidiqbal.com` itself
has **zero** registered subdomains or parked domains of its own
(`hosting_websites_list-domains` returns `{"parked":[],"subdomains":[]}`) —
admin and learn are siblings on the same Hostinger account, not nested
under the apex domain in any hosting-level sense. This is the central fact
that makes "just change the URLs" not actually simple: getting `/admin/*`
and `/learn/*` to be real, browser-visible paths under `shahidiqbal.com`
requires either a routing layer Hostinger can serve, or physically merging
codebases so one process owns the apex domain's hosting slot. See §9.

The good news, found by reading the code rather than assuming: **this is
substantially less greenfield than the brief anticipated.**

- `apps/admin` already has a second, live database connection
  (`apps/admin/src/db/learnDb.ts`) directly into `apps/learn`'s own MySQL
  database, using a schema mirror confirmed byte-identical to Learn's own
  schema files. Its `/dashboard/learn/*` section already manages students,
  courses, enrollments, products, orders, and payments from inside the
  admin app.
- `apps/learn` **also** has its own, separate, full-featured `/admin/*`
  route group (enrollments, orders, communities, payment-methods, settings,
  courses, roadmap, students, products, exchange-rates, announcements,
  payments) managing the exact same data through its own UI.

These two UIs are a real, already-existing duplication the brief asks the
consolidation to resolve (§8 below) — not something consolidation would be
introducing.

---

## 2. Application inventory

### 2.1 Main site (`/`, Astro)

- `output: 'static'`, deployed via `.github/workflows/deploy.yml` — build
  Astro, rsync `dist/` over SSH to Hostinger shared hosting's
  `public_html`, fix permissions. No GitHub Actions involvement for admin
  or learn's own deploys (those are separate workflows, see §6).
- No server runtime, no database, no session capability — confirmed by
  `docs/ADMIN_ARCHITECTURE.md`'s own explicit statement and by
  `astro.config.mjs`.
- The two interactive bits (contact form, booking form) are standalone PHP
  scripts (PHPMailer + Hostinger SMTP + Turnstile + honeypot + rate limit),
  which also make a best-effort, non-blocking POST to `apps/admin`'s
  `/api/public/leads-intake` after sending the real email
  (`LEADS_INTAKE_SECRET`, shared with `shahid-security-config.php`).
- 23 `.astro` pages under `src/pages/`, plus `src/pages/learn.astro`,
  `src/pages/learn/pricing.astro`, `src/pages/learn/roadmap.astro`. These
  three `/learn*` pages are **marketing/informational only** now — they
  link out to `https://learn.shahidiqbal.com` (a hardcoded
  `LEARN_APP_URL` constant) for the actual app; they do not themselves run
  any LMS functionality. The real course catalog and course-detail pages
  used to live here but were moved into `apps/learn` itself in an
  October 2026 revision (`next.config.mjs`'s own comment: "docs/lms-architecture.md
  §6 is stale on this point" — confirmed correct; that file's §6 does
  describe the old, now-wrong split, with its own "Revision (2026-10)" note
  partially catching up).

### 2.2 Admin panel (`apps/admin`)

- Next.js 16.4.3, App Router, `output: 'standalone'`, Drizzle ORM +
  mysql2, 65 page routes under `src/app/`, 19 API routes.
- Own MySQL database (`shahid_security_admin_*`), schema split across
  `identity / business / content / crm / google / seo / publishing /
  pricing`.
- **Plus** a second pooled connection, `learnDb` (`src/db/learnDb.ts`),
  into `apps/learn`'s database, using the **same narrow runtime DB user**
  Learn's own server already uses (read/write, never DDL) — deliberately a
  distinct client from the main `db` export, per that file's own comment,
  because these are genuinely two separate MySQL databases, not one shared
  schema reached two ways.
- Session auth: `ssa_session` cookie, 12-hour fixed expiry, SHA-256-hashed
  opaque token stored server-side, httpOnly/secure(prod)/sameSite=lax.
- RBAC: fully data-driven, never a hardcoded `if (role === 'admin')` check
  — `admin_roles`, `admin_permissions`, `admin_role_permissions` (many-to-many),
  `admin_user_roles`. Six seeded roles: `super_admin` (implicit all
  permissions), `administrator`, `editor`, `seo_manager`, `finance`,
  `support`. `docs/ADMIN_ARCHITECTURE.md` states every server action calls
  `requireAdminAction(permissionKey)` as its first line, verified by that
  doc's own audit claim (not independently re-verified in this pass, but
  consistent with the code sampled).
- Audit logging: `audit_logs` table, insert-only **enforced at the MySQL
  grant level**, not just by application convention — the app's own
  runtime DB user genuinely cannot UPDATE/DELETE that table.
- File/media storage: **stored as bytes in the database** (`media` table,
  `longblob` column), not on disk. This is deliberate, not an oversight —
  see §5.
- Deploy: Hostinger's own native Git-connected build pipeline does the
  actual build/deploy; `.github/workflows/deploy-admin.yml` only polls a
  `build-info.json` endpoint for the new commit SHA, then calls
  `/api/internal/migrate` and `/api/internal/apply-grants` once it's
  confirmed live — a deliberate guard against a confirmed real incident
  where migrations ran against the stale pre-swap server.

### 2.3 LMS (`apps/learn`, "Learn with Shahid")

- Next.js 16.4.3, same architectural pattern as admin (standalone, Drizzle
  + mysql2, same deploy-workflow shape), 41 page routes, 15 API routes.
- Own MySQL database, schema split across `identity / courses / commerce /
  enrollment / certificates / community / support / platform`.
- Session auth: `lws_session` cookie, 30-day expiry for students / 12-hour
  for admin-role users (the login route picks the duration based on the
  authenticated user's roles).
- Has its own full internal `/admin/*` route group — see §8.
- Luna (AI support chatbot, `@anthropic-ai/sdk`): this app is "the only
  server in this project with an `ANTHROPIC_API_KEY`" — the main site's
  own Luna widget calls `apps/learn`'s `/api/luna/chat` cross-origin for
  this reason. Unanswered questions get logged to `apps/admin` via a third
  secret-gated bridge, `/api/public/ai-questions-intake`
  (`AI_QUESTIONS_INTAKE_SECRET`).
- SEO: course catalog/detail pages are real, indexed, dynamic pages on
  `learn.shahidiqbal.com` (not noindexed) — `/dashboard/*`, `/admin/*`,
  `/api/*`, and the token-bearing reset/verify pages are noindexed by three
  independent mechanisms (scoped `X-Robots-Tag` header, per-layout
  `robots: {index:false}` metadata, and `robots.ts`'s `disallow` list).

---

## 3. Database inventory

Two genuinely separate MySQL databases, no shared schema:

- **Admin DB**: identity (admin users/roles/permissions/sessions),
  business, content, crm, google (OAuth tokens, AES-256-GCM encrypted at
  rest), seo, publishing, pricing (see §4).
- **Learn DB**: identity (students + admin-role LMS users — a different
  `users` table from admin's `adminUsers`, deliberately; see
  `docs/ADMIN_ARCHITECTURE.md` §"Stack"), courses, commerce (see §4),
  enrollment, certificates, community, support, platform.
- **The bridge**: `apps/admin`'s `learnDb.ts` connection, read/write into
  Learn's DB using Learn's own runtime credentials, via a local schema
  mirror in `apps/admin/src/db/schema/learn/` confirmed byte-identical
  (`diff`) to `apps/learn/src/db/schema/`. Keeping this mirror in sync by
  hand whenever Learn's schema changes is an existing, real maintenance
  cost this audit is flagging, not introducing.

No evidence of any other database. No ORM-level link between Admin's own
`pricing` tables and Learn's `commerce` tables — they are two unrelated
systems (§4).

---

## 4. Payments and commerce — two independent systems, not one

This matters enough to call out on its own, since the brief's Section 10
assumes a single payment/enrollment chain to audit, and there are actually
two, serving different purposes:

**A. Site services pricing** (`apps/admin/src/db/schema/pricing.ts`) — backs
the public `/pricing` page on `shahidiqbal.com` (monthly cybersecurity
support plans, one-off add-on services, a paid-consultation fee, admin-set
FX rates for the "approximate local currency" display, and a kill-switch
settings row gating whether Managed Detection & Response is ever shown as
purchasable). **There is no payment gateway behind this at all** — it is
pricing display and a paid-consultation *booking* flow, not a checkout.
Nothing in `.env.example` for either app names a payment-gateway credential
for this system.

**B. LMS commerce** (`apps/learn/src/db/schema/commerce.ts`) — the real
purchase chain: `products` (course/membership/bundle/workshop/bootcamp/
mentoring/digital_product/live_class) → `prices` (per-currency, per-country,
minor-units-only) → `orders` → `payments` → (`manualPaymentSubmissions` for
bank-transfer/crypto/mobile-wallet claims awaiting admin verification, or
`refunds`). `payments.status` starts at `pending_verification` and only an
admin action moves it to `succeeded` — consistent with the brief's "never
mark a payment successful without verified evidence" rule, enforced by the
schema's own design, not just by convention. `coupons`/`couponUsage` exist
in the schema but have no UI or checkout logic wired yet (explicitly a V2
schema-now/logic-later decision per `docs/LMS_V1_SCOPE.md`). **No online
payment gateway is wired here either** — `method` is constrained to
`online | manual | free`, and nothing in the codebase or either app's
`.env.example` shows an actual gateway integration for the `online` value
yet. Confirming whether a gateway integration exists anywhere else, or is
still entirely unbuilt, is an open item for Phase 1.2 (not resolved in this
pass — see §10).

These two systems should **not** be merged into one in the consolidation —
they price and sell structurally different things (recurring security
support contracts vs. one-time/subscription course access) for two
different audiences, and the brief's own Section 10 instruction not to
"create duplicate payment systems" is about not building a *third* one, not
about collapsing these two into each other.

---

## 5. File/media storage — a real hosting constraint, not a stylistic choice

`apps/admin/src/lib/media.ts` stores uploaded files as bytes in a MySQL
`longblob` column, not on disk, with code comments documenting *why*:
disk storage was tried first (under `data/media-uploads`, chosen to sit
outside the Next.js build's file-tracing), but Hostinger's actual deploy
mechanism swaps in a brand-new versioned directory
(`hbuilds/versions/<uuid>`) on every single deploy — confirmed directly,
not assumed, after a real incident where a course thumbnail vanished after
a routine redeploy. The database is the one piece of state on this host
that deploy never touches. Uploads are allowlisted by content (magic
bytes/MIME, not filename) to five types (jpeg/png/webp/gif/pdf), capped at
10MB, with the stored filename always `<uuid>.<allowlisted-extension>` —
never the browser-supplied name — closing the classic "upload shell.php.jpg"
bypass.

**This is a hard constraint on the consolidation's storage strategy**
(brief §7): whatever the unified platform does for file storage, it must
either keep storing file bytes somewhere that survives a redeploy (DB blob,
as now, or genuinely external object storage) — never the merged app's own
filesystem, which this host will continue to wipe on every deploy
regardless of how the codebases are consolidated.

---

## 6. Hosting and deployment — live Hostinger state

Confirmed via the Hostinger API (`hosting_websites_list`,
`hosting_websites_list-domains`) on 2026-11-08:

- `shahidiqbal.com`, `admin.shahidiqbal.com`, `learn.shahidiqbal.com` are
  three separate **addon** websites under one Hostinger account/order, each
  flagged `website_type: "nodejs"` by Hostinger's own type detection —
  including the main site, which is actually serving static files. This
  discrepancy (nodejs-flagged but static-deployed) was not further resolved
  in this pass; it does not block anything in this audit's findings, but is
  worth a direct hPanel check before relying on Hostinger's `website_type`
  field for anything load-bearing in the migration plan.
- `shahidiqbal.com` has no registered subdomains/parked domains of its own.
  Admin and Learn are not nested under it at the hosting level — they are
  separate top-level addon sites that happen to share a DNS parent name.
- All three deploy pipelines are confirmed **currently green**: a push to
  `claude/wizardly-keller-yg0bj7` on 2026-11-06 produced three successful
  GitHub Actions runs same day — `Deploy to Hostinger` (Astro, run #220),
  `Deploy Learn with Shahid (LMS)` (run #101), `Deploy Shahid Security
  Admin` (run #76). The Astro deploy is a plain rsync; the admin/learn
  deploys are Hostinger's own native Git-auto-deploy doing the real
  build, with the GitHub Actions workflow only polling a `build-info.json`
  endpoint and then calling internal migrate/grants routes once the new
  commit is confirmed live.
- **`docs/DEPLOYMENT.md` (dated 2026-10-06) is stale**: it states
  `apps/admin` "has never successfully deployed anywhere" and recommends
  deploying it at `shahidiqbal.com/admin` (a path, not a subdomain) "per
  Shahid's explicit preference." Both the "never deployed" claim and the
  implication that the subdomain approach was abandoned are contradicted by
  the live, green 2026-11-06 deploy to `admin.shahidiqbal.com`. Whether the
  path-based preference that doc describes is still the owner's actual
  preference, or was itself superseded when the subdomain got provisioned
  and wired up, is exactly the kind of open question this audit is
  surfacing rather than guessing at — see §10.
- That same stale doc's "Option A" is nonetheless a useful, concrete lead
  for the consolidation: it describes Hostinger's hPanel apparently
  supporting a **second "Website" entry pointed at the same domain with its
  own path** (e.g. `shahidiqbal.com/admin`) rather than only a new
  subdomain — which, if still true on this account/plan, would let
  `/admin` and `/learn` become real paths on the apex domain **without**
  merging the Next.js codebases, via a hosting-level routing mechanism
  instead of an application-level one. The doc itself flags this as
  unconfirmed ("whether this specific product supports a path... is
  something only visible from inside that panel"). **Verifying this
  directly in hPanel (or via the Hostinger API) is the single highest-value
  next step before choosing between the architecture options in §9** — it
  determines whether Option 9A or 9B below is even on the table.

---

## 7. Auth/session summary (both apps)

Both apps use the same pattern, independently implemented: scrypt-hashed
passwords (admin) and the equivalent in Learn, opaque random session
tokens, SHA-256-hashed before storage (a stolen DB row alone is never a
replayable cookie), server-validated on every request (not JWT, no
client-trusted claims). Cookie names and lifetimes differ (`ssa_session`/
12h fixed vs. `lws_session`/30-day student or 12h admin-role) and there is
**no shared session between the two apps today** — logging into admin does
not log you into Learn and vice versa. Any unification (brief §5) has to
either bridge these two independent systems or replace both with one, and
either path touches every existing admin and student session — this is one
of the higher-risk, higher-blast-radius pieces of the whole project and
should get its own careful design pass before any code changes, not be
folded into a general "merge the apps" step.

---

## 8. Confirmed duplication: two admin UIs over the same LMS data

`apps/learn/src/app/admin/` is a complete, independent admin UI:
`enrollments`, `orders`, `communities`, `payment-methods`, `settings`,
`courses` (+ `new`, `[id]`), `roadmap`, `students` (+ `[id]`), `products`
(+ `new`, `[id]`), `exchange-rates`, `announcements` (+ `[id]`), `payments`
— each with its own `actions.ts` and `page.tsx`.

`apps/admin/src/app/dashboard/learn/` manages the same underlying data
(courses, products, media/thumbnails) through `learnDb.ts`.

These were both built as real, working features at different points in the
project's history, not as a half-finished duplicate — both have live
server actions against real data. Deciding which one becomes the single
canonical LMS-management UI (and what happens to the other: retire it,
fold specific unique features from it into the winner, or keep it as an
internal-only fallback) is a concrete, scoped decision the consolidation
needs to make early, since it affects which codebase physically needs to
move into the new `/admin/*` namespace and which can simply be deleted.

---

## 9. What "one domain" requires, mechanically

Given §6's finding (three separate addon-domain hosting slots, zero
subdomains actually nested under the apex domain), serving `/admin/*` and
`/learn/*` as real paths under `https://shahidiqbal.com` needs one of:

- **9A. Hosting-level path routing** — if Hostinger's panel genuinely
  supports a second "Website"/app bound to the same domain at a path (per
  the stale-but-specific lead in §6), admin and learn could each stay their
  own Next.js codebase and deploy pipeline, each just re-pointed at a path
  instead of a subdomain. Lowest code risk, most preserves what already
  works; entirely dependent on a hosting capability not yet confirmed.
- **9B. Application-level routing (Next.js Multi-Zones)** — the apex
  domain's own Next.js app (or a new thin one) owns the hosting slot and
  internally rewrites `/admin/*` and `/learn/*` to the existing admin/learn
  apps as separate deployed zones, each given a matching `basePath`. Works
  without relying on a Hostinger-specific feature, at the cost of a new
  routing-layer app to build, test, and keep in sync, and of giving every
  existing admin/learn route a `basePath` prefix it doesn't have today.
- **9C. Physical merge** — fold `apps/admin` and `apps/learn` into one
  Next.js codebase (two route groups) that owns one hosting slot and also
  serves the Astro site's static output for `/`. Highest short-term
  engineering cost (two independent codebases' routing, middleware, env
  vars, and build config have to be reconciled into one), but removes the
  routing-layer question entirely and is the most conventional long-term
  shape for "one platform."

This audit does not recommend one of these yet — 9A's viability is a
concrete, checkable fact (not yet checked), and it changes the entire shape
of the migration plan. Resolving it is the first concrete action item
handed back to you in the accompanying proposal summary.

---

## 10. Open questions / blockers for your decision

1. **Hosting path-routing capability (§6, §9A)** — can this Hostinger
   account/plan actually serve two different Node.js apps (or a Node app +
   static files) under one domain by path? This gates the entire
   architecture choice.
2. **Is any online payment gateway actually wired anywhere** for LMS
   checkout (`orders`/`payments.method = 'online'`), or is `manual`
   (bank/crypto/mobile-wallet with admin verification) the only live path
   today? Not resolved in this pass.
3. **Which LMS admin UI is canonical** (§8) — `apps/learn`'s own
   `/admin/*`, or `apps/admin`'s `/dashboard/learn/*`? This is your call,
   not a technical one — both are real and working.
4. **Brand palette** — this project's brief describes "dark navy, electric
   blue accents" as the design direction. The live site (and both apps,
   after the 2026-11-06 sync) actually use an indigo-violet (`#6a5acd`) /
   amber (`#f4a62a`) / cream (`#f0d9b5`) palette on near-black
   (`#1a1a1f`) — "electric blue" was an intermediate scheme from before the
   current redesign and is no longer live anywhere. Flagging this now so
   the unified design system (brief §8) is built against the actual
   current palette, not a description that predates it.
5. **Is `docs/DEPLOYMENT.md`'s "path, not subdomain, per Shahid's explicit
   preference" note (§6) still your preference**, now that the subdomain
   is actually live and working? If yes, that's an argument for 9A/9C over
   keeping subdomains at all, even as an interim step.

---

## 11. What this audit deliberately does not cover yet

Per the project's own phasing, this document stops at discovery. Database
migration mechanics, the actual architecture recommendation, security
review, test plan, and the remaining required documents
(`UNIFIED_ARCHITECTURE.md`, `DATABASE_MIGRATION_PLAN.md`,
`URL_REDIRECT_MAP.md`, `DEPLOYMENT_GUIDE.md`, `SECURITY_REVIEW.md`,
`MIGRATION_VALIDATION_REPORT.md`, `SUBDOMAIN_RETIREMENT_CHECKLIST.md`)
follow once the open questions in §10 — especially §10.1 — are answered.
