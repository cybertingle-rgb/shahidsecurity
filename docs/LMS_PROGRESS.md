# Learn with Shahid — Progress

**Current phase:** Phase 3 — Admin dashboard. **Built, tested (real browser automation, not just unit tests), and verified locally against MySQL. Real deployment of Phases 2–3 together is blocked on one thing only you can do (below) — everything I could build without it is done.**

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

## What I could not do myself (not a permission gate — a capability one)

I have no browser and no external account credentials in this sandbox. One thing blocks turning any of this from "built and tested locally" into "actually deployed":

1. **Hostinger's hPanel "Setup Node.js App" wizard**, run once against the subdomain you already created — sets the startup file to `server.js` and confirms the Node.js version available. While there, also check whether your MySQL admin user has `GRANT OPTION` (see `apps/learn/README.md`'s "Two database users" section for exactly what to check and the fallback if it isn't available).

Full instructions, plus the exact GitHub secrets to add (`LMS_DATABASE_ADMIN_URL`, `LMS_DATABASE_URL`, `LMS_SESSION_SECRET`, `LMS_APP_URL`) and an honest note about the untested Passenger-restart-file convention the deploy workflow uses, are in `apps/learn/README.md`.

Until that's done, `deploy-lms.yml` will run on every push to `apps/learn/**` and fail at the build step — expected, harmless (touches nothing on the live marketing site), and not something to work around by faking a value.

## Next

1. You: complete the hPanel Node.js App setup and check the `GRANT OPTION` question, then add the four GitHub secrets.
2. Me, once those secrets exist: confirm the first real deploy succeeds, verify the restart mechanism actually works, then continue with Phase 4 (student dashboard) per `LMS_IMPLEMENTATION_PLAN.md` — no new infrastructure needed for Phases 4–6.
3. Payment provider and transactional email provider choices remain open, needed by Phase 7, not blocking anything before it.

## Blocked

Real deployment is blocked on the item above. Nothing else is blocked — Phase 4 onward can continue against the local dev database regardless.

## Not started

Phases 4–15 in full, per `LMS_IMPLEMENTATION_PLAN.md`.
