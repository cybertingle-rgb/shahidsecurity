# Learn with Shahid — Implementation Plan

Phased per the brief's own instruction: no phase starts until the previous one is built, tested, documented, and — where it touches production, infrastructure, payments, or pricing — explicitly approved. See `lms-deployment.md` for what always requires sign-off regardless of phase.

| Phase | Scope | Requires your approval before starting? |
| --- | --- | --- |
| **1. Architecture audit** | This round of documents. | Approval to *proceed to Phase 2* — i.e., to actually provision anything. |
| **2. Database & authentication** | Provision staging Postgres, implement schema from `lms-database.md`, auth (register/verify/login/reset) from `lms-security.md`. | **Yes** — first real infrastructure (hosting account, staging database). |
| **3. Admin dashboard** | Admin shell, RBAC enforcement, student management, settings (no payments yet). | No new infra; builds on Phase 2. |
| **4. Student dashboard** | Student shell, profile, settings. | No new infra. |
| **5. Courses/Lessons** | Course/module/lesson CRUD, course player, video-source abstraction. | No new infra. |
| **6. Membership** | Membership product, enrollment logic (manual-grant only — no payment yet). | No new infra. |
| **7. Payments** | Provider integration (`lms-payments.md`), manual bank-transfer flow, orders, refunds, coupons. | **Yes** — real payment credentials, real money. Runs against sandbox/test credentials until explicitly told to go live. |
| **8. Community management** | `/admin/communities`, student-facing eligibility/invite flow. | No new infra, but **community invite links themselves must come from you**, not invented. |
| **9. Progress/Quiz/Certificates** | Progress tracking, quiz engine, certificate issuance + `/verify/[id]`. | No new infra. |
| **10. SEO** | `/learn/*` static pages on the existing site, roadmap, resources hub, structured data. | No new infra; **does** touch the existing site's codebase — reviewed against the SEO regression checklist before merge. |
| **11. Analytics** | Event tracking (`lms-business-model.md`'s funnel, brief's named events), admin analytics views. | No new infra unless a dedicated analytics tool is added, in which case that tool choice is flagged for approval. |
| **12. Security audit** | The full pre-launch review list in `lms-security.md`. | Findings reported before Phase 13 starts. |
| **13. Performance optimization** | Caching, pagination, image/video delivery review, load testing against realistic volume. | No new infra unless a CDN/cache layer is added, flagged if so. |
| **14. Testing** | The full test list below, including explicit unauthorized-access tests. | No approval needed to write tests; failures block progress to Phase 15 regardless. |
| **15. Production deployment** | Real DNS, real domain, real payment credentials flipped live, public launch. | **Yes — explicitly, in writing, right before this phase, not assumed from earlier approvals.** |

## Testing scope (Phase 14, tracked here so it isn't lost between phases)

Authentication, authorization, registration, login, password reset, course access, enrollment, payment verification, duplicate-payment handling, coupon logic, membership access, community access, progress tracking, certificate generation, admin permissions, student permissions, file uploads, webhook security, refunds — **plus the explicit negative tests the brief calls out by name**: Student A cannot access Student B's private data; a student cannot access an unpaid course; a normal user cannot reach `/admin`; an instructor cannot modify another instructor's course; the frontend cannot manipulate a course's price; a payment success response cannot be faked from the browser.

## Ground rules for every phase (not just the risky ones)

After each phase: run tests, run the build, document what changed, update `LMS_PROGRESS.md`, name any new risks found, and stop for approval before anything marked "Yes" above. No phase attempts the whole system in one uncontrolled change — this table exists specifically so that doesn't happen by accident under time pressure.
