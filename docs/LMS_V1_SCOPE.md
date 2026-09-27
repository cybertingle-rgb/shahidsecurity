# Learn with Shahid — V1 Scope

**Status:** approved scope for the first build (Phases 2–9 of `LMS_IMPLEMENTATION_PLAN.md`). Nothing below is built yet — this document defines the boundary, so scope discussions during implementation have a fixed reference instead of drifting.

Rule for this whole document: **if it isn't listed under "V1 includes," it's V2 or later**, even if it seems small. See `LMS_DECISIONS.md` #20–21 for why the boundary is deliberate.

## V1 includes

### Public (no login required, on `learn.shahidiqbal.com` unless noted)

- Learn with Shahid landing page
- Cybersecurity roadmap (`/learn/roadmap` — static, on the existing site, per `lms-roadmap.md`)
- Course catalog
- Course detail pages
- Pricing (PKR only; see `LMS_DECISIONS.md` #15)
- FAQ
- Registration
- Login

### Student (authenticated)

- Dashboard
- Enrollment (the PKR 800 "Learn with Shahid Enrollment" membership, plus individual course purchases)
- My Courses
- Course progress
- Community access (Discord/Facebook/Telegram — eligibility + admin-managed invite links/instructions, per the `community_access` state machine; **not** automatic API-driven addition to any platform)
- Profile
- Orders / payment history

### Admin

- Dashboard
- Students
- Courses
- Lessons
- Enrollments
- Products
- Orders
- Payments
- Communities
- Pricing
- Announcements

### Payments

- **One** properly integrated online provider (pending the fee/terms comparison in `lms-payments.md`; Safepay is the current lead candidate, not yet chosen)
- Manual bank transfer
- Admin payment verification (approve / reject / request clarification queue)

### Learning content

- Video lessons
- Text lessons
- PDFs / resources
- Quizzes
- Progress tracking

## V1 explicitly excludes (documented in the relevant Phase 1 doc, not built until V2)

| Feature | Where it's documented for later |
| --- | --- |
| Certificates (issuance + public verification page) | `lms-database.md` (`certificates`, `certificate_verifications` tables exist in the schema now); `lms-student-guide.md` |
| Coupons | `lms-database.md` (`coupons`, `coupon_usage`); `lms-payments.md` anti-fraud section |
| Course bundles | `lms-database.md` (`products.type = 'bundle'`); `lms-business-model.md` |
| Live classes | `lms-database.md` (`live_classes`, `live_class_attendance`); `lms-admin-guide.md` |
| Advanced analytics | `lms-admin-guide.md`'s Analytics & Reports section (V1 ships basic counts only — see below) |
| Automated email campaigns | Not designed yet beyond transactional email (verification, receipts, password reset) |
| Multiple payment providers | `lms-payments.md` — the abstraction supports it; only one is integrated in V1 |
| Subscriptions | `lms-business-model.md` — explicitly deferred until a provider with real recurring-billing support is chosen |
| Mentorship | `lms-database.md` (`products.type = 'mentoring'`); `lms-business-model.md` |
| Corporate training | `lms-business-model.md` — flagged as likely needing an invoice-based path, not self-serve checkout |
| Advanced community automation (e.g. auto-inviting via platform APIs) | `lms-database.md`'s `community_access` state machine is designed for this to slot in later without a schema change; V1 is admin-assisted/manual |

## What "basic" means for the V1 items that have a V2-richer version

- **Analytics (admin)**: V1 shows the counts and lists that come naturally from the schema already built for other reasons — total students, total enrollments, orders/payments list, basic revenue total. It does not include charts, funnels, cohort analysis, or export tooling — those are the "Advanced analytics" V2 line above.
- **Community access**: V1 is exactly the `not_eligible → eligible → invited → joined` flow with admin-managed links; no platform API integration (e.g. auto-adding to a Discord server via its API) ships in V1.
- **Quizzes**: V1 supports the question types and settings already in `lms-database.md` (`quizzes`, `quiz_questions`, `quiz_attempts`) — multiple choice, multiple answer, true/false, short answer, pass threshold, attempt limits. It does not include certificate issuance on completion (that's the Certificates line above) — a passed quiz updates progress only in V1.

## Why this boundary, specifically

Every V1 feature above is required for a student to discover the product, pay for it once, and actually learn something and track progress — the minimum real, non-fake product. Everything in the exclusion table is real, designed, and schema-ready (per `LMS_DECISIONS.md` #12–13, #21) but adds either a second payment provider's integration risk, a second content-editing surface (coupons, certificates), or a feature that only matters once V1 has real enrolled students to use it on. Building V1 first and shipping it is how the roadmap actually gets validated against real usage before more is built on top of it.
