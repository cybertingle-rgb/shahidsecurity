# Learn with Shahid — Progress

**Current phase:** Phase 3 — Admin dashboard, code complete. **Built, tested (real browser automation, not just unit tests), and verified locally against MySQL. Real deployment is on hold while you transfer the domain to a new host with a higher plan (Hostinger's Node.js hosting turned out to need a plan upgrade) — see "Hosting update" below. Local development continues regardless.**

## Completed

### Phase 1 (architecture, approved)
Full audit, architecture proposal, database/security/payment/business-model design, 15-phase plan with V1/V2 split — see `docs/lms-architecture-audit.md` through `docs/LMS_PRE_PHASE_2_REVIEW.md`. All decisions locked in `docs/LMS_DECISIONS.md` (36 entries across two addenda, including the mid-review Hostinger hosting update and the MySQL database-engine change).

### Phase 2 — Database & authentication
`apps/learn` (Next.js 16 + TypeScript + Tailwind), full 48-table MySQL schema, real authentication (register/login/logout/verify-email/reset-password with scrypt hashing, server-side sessions, rate limiting), database-backed RBAC, IDOR-safe query pattern, server-side-only price resolution, `audit_logs` made insert-only via two MySQL database users. See the Phase 2 entry in git history and `apps/learn/README.md` for full detail — summarized here so this file stays about what's current.

### Phase 3 — Admin dashboard (this round)
Full admin management UI + Server Actions for every V1 admin area named in `docs/LMS_V1_SCOPE.md`, each one calling `requireAdminAction(<permission key>)` first and writing to `audit_logs`:

- **Students** (`/admin/students`): search/list, per-student detail (roles, enrollments, orders), suspend/reactivate (suspending also kills any active session), manual enrollment grant, enrollment revoke.
- **Courses** (`/admin/courses`): create, edit metadata, and the full draft → review → published → archived workflow, with `courses.publish` requiring its own permission separate from `courses.update` (publishing is a deliberate act, never automatic, per `lms-admin-guide.md`'s content workflow rule). Module/lesson content editing is correctly deferred to Phase 5, not built here.
- **Products & Pricing** (`/admin/products`): product CRUD, and per-currency/per-country price rows — the admin-facing side of "PKR 800 must never be hardcoded" (`LMS_DECISIONS.md` #8): the form takes a normal amount and converts to minor units server-side, once, in one place.
- **Enrollments** (`/admin/enrollments`): a global view across every student, with revoke.
- **Orders** (`/admin/orders`) and **Payments** (`/admin/payments`): order history, and the manual-payment verification queue (Approve/Reject/Request-clarification) — approving is the *only* code path that flips an order to paid and creates the enrollment, per `lms-payments.md`'s "a screenshot alone never grants access" rule. Empty until Phase 6/7 build the checkout flow that actually creates these rows — that's expected, not a bug.
- **Communities** (`/admin/communities`): create/edit Discord/Facebook/Telegram/WhatsApp invite links, required-product gating, active/inactive toggle — URLs never hardcoded in a template, per `LMS_DECISIONS.md` #10.
- **Announcements** (`/admin/announcements`): create and list; an email-delivery checkbox is recorded but honestly labeled as not wired up yet (no bulk-email sender exists).
- **Admin dashboard** (`/admin`): nav shell linking to all of the above — deliberately no counts/analytics yet, since that's Phase 11's job, not Phase 3's.

**Verified, not just written**: `next build` and the standalone TypeScript check both pass. A real headless-Chromium (Playwright) run drove the actual browser through the full flow against the running app — create a course → submit for review → publish; create a product → set a price; create a community; publish an announcement; manually enroll a student into the new course and see it show up on both their profile and the global enrollments list; suspend and reactivate a student — **13/13 checks passed against real UI interaction**, not mocked. `curl`-based checks re-confirmed the RBAC boundary: every new `/admin/*` page returns 200 for an admin session and 404 for a student session. Two new automated vitest tests added (20/20 total now passing) confirming the exact permission keys these new actions use (`courses.publish`, `payments.verify`, `enrollments.manage`, etc.) are correctly granted and — just as importantly — that a user with only one of them is denied all the others.

## Mid-Phase-2 change: PostgreSQL → MySQL (for context)
You asked why an external Postgres provider was needed given you already have Hostinger hosting. The whole database layer was rewritten to MySQL so everything runs on your existing account — see the Phase 2 commit and `apps/learn/README.md`'s "Two database users" section for the one real trade-off that came out of it (MySQL needs two DB users and `GRANT OPTION` to make `audit_logs` genuinely tamper-proof at the database level; unconfirmed whether your plan allows it).

## Hosting update (2026-09-27): moving off Hostinger

Turns out Hostinger's Node.js "Web App" hosting is locked on your current plan — it requires Business or a Cloud plan (Cloud Startup/Professional/Enterprise), not available on Premium/entry shared hosting. Rather than upgrade Hostinger, **you're transferring the domain to a different host where you already have a higher plan.** Plan, as you described it:

1. Complete the domain transfer to the new host.
2. Connect that host's GitHub integration and get `shahidiqbal.com` (the marketing site) deploying there first.
3. Once that's solid, bring `learn.shahidiqbal.com` (this app) over the same way.

**I'm not touching DNS, hosting configs, or either deploy workflow until the transfer is done and you share the new host's details** — domain transfers are delicate and I don't want to interfere with one mid-flight. One likely upside once we get there: many modern hosts (including Hostinger's own Business/Cloud tier, for what it's worth) auto-deploy directly from a connected GitHub repo, which would replace the manual SSH/rsync + untested Passenger-restart-file approach `deploy-lms.yml` currently uses with something more reliable.

## What I could not do myself (not a permission gate — a capability one)

I have no browser and no external account credentials in this sandbox. Real deployment of Phases 2–3 is on hold until:

1. **The domain transfer completes** and `shahidiqbal.com` is deploying on the new host.
2. **You share the new host's deployment mechanism** (GitHub auto-deploy vs. SSH, its Node.js version support, and whether it's MySQL or something else) so I can update `.github/workflows/deploy.yml` and then `deploy-lms.yml`/`apps/learn`'s database layer to match — worth revisiting the MySQL-vs-Postgres call too if the new host makes Postgres easier than Hostinger did.

`deploy-lms.yml` (still pointed at Hostinger) will keep failing on every push to `apps/learn/**` until this is sorted — expected, harmless (touches nothing live), not something to work around by faking a value.

## Next

1. You: finish the domain transfer, get `shahidiqbal.com` live on the new host via its GitHub integration, then tell me so I can update the deploy workflows.
2. Me, in the meantime: keep building Phase 4 (student dashboard) and beyond against the local dev database — none of that depends on where it eventually deploys.
3. Payment provider and transactional email provider choices remain open, needed by Phase 7, not blocking anything before it.

## Blocked

Real deployment is blocked on the domain transfer + new host details above. Nothing else is blocked — Phase 4 onward can continue against the local dev database regardless.

## Not started

Phases 4–15 in full, per `LMS_IMPLEMENTATION_PLAN.md`.
