# Learn with Shahid — Admin Guide (planned)

**Status: not yet implemented.** This describes the intended admin experience for Phases 3–11; it will be rewritten as an actual how-to guide once the admin app exists. Route list and permission model are defined in `lms-architecture.md` §3 and `lms-database.md`'s RBAC tables.

## Navigation

Dashboard · Students · Courses · Enrollments · Products · Orders · Payments · Memberships · Communities · Coupons · Certificates · Announcements · Live Classes · Resources · Analytics · Reports · Support · Audit Logs · Settings

## Dashboard

Cards: Total/Active/New Students, Total Enrollments, Active/Completed Courses, Revenue, Pending/Successful Payments, Refunds, Memberships, Community Members. Charts: registrations, enrollment growth, course sales, revenue, completion rate, most popular courses, membership growth. Recent activity feed: registrations, enrollments, payments, completions, certificates issued, community access granted. All filterable by date, course, student, and payment/enrollment status — filters are query parameters against indexed columns, not client-side filtering of an unbounded dataset (a real requirement once "thousands of students" is the target).

## Student management

Search, view profile (registration date, enrolled courses + progress, payment history, membership status, community access, certificates), suspend/reactivate, manually enroll or remove an enrollment, add internal notes, export data. **Exports and internal views only ever show what's necessary for the task at hand** — a support-ticket view doesn't need to surface a student's full payment history, for instance; each admin screen requests only the fields it displays.

## Course & content management

Create/edit courses (all fields from the brief: title, slug, descriptions, thumbnail, instructor, category, level, duration, language, price *reference* — the actual price lives in Products, see below — status, SEO fields), modules, lessons (video/text/PDF/quiz/assignment/etc., with free-preview/members-only/drip-release settings). Draft → Review → Published → Archived workflow; publishing a course is a deliberate admin action, never automatic, per the brief's content-workflow rule.

## Products, orders, payments, coupons

Products page lists every catalog item (course, membership, bundle, etc. — see `lms-business-model.md`) with its prices **per currency/country**, editable without touching code. Orders and Payments give a searchable, filterable ledger; manual payment submissions surface in a dedicated "Pending Verification" queue with Approve/Reject/Request Clarification actions (`lms-payments.md`). Coupons: create/edit with all the fields the brief specifies (type, value, expiry, usage limits, applicable products, minimum order).

## Memberships & communities

`/admin/communities`: add/edit/disable a community, set which product/membership makes a student eligible, set display order — never a hardcoded link in a template. Community access requests surface with their real state (`eligible`/`invited`/`joined`/etc., per `lms-database.md`), not a binary yes/no that overstates what's actually been done on the external platform.

## Certificates, announcements, live classes, resources

Enable certificates per course; issued certificates list with verification links. Announcements: compose, target (all/membership/course/group), choose channels (dashboard/email). Live classes: schedule, attach a private meeting URL (never exposed publicly), record attendance, attach a recording afterward. Resources and roadmap stages: manage the content described in `lms-roadmap.md` from here, including reordering stages and attaching resources/courses to each.

## Analytics & reports

Student/enrollment/revenue growth, average order value, course sales and completion, popular courses, conversion funnel, membership growth, payment success/failure, refunds, coupon usage — all date-filterable. Exports (student list, enrollment/course-performance/payment/revenue/certificate/membership reports) respect the same authorization and data-minimization rules as the rest of the admin app.

## Settings

Sectioned exactly as the brief specifies: General, Brand, Education, Payments, Email, Communities, Courses, Certificates, Coupons, SEO, Analytics, Security, Notifications, Legal. This is where the enrollment price, currency defaults, community links, support email, and course defaults actually live — **never hardcoded**, per the recurring theme of this whole architecture. Secrets (payment API keys, email provider keys) are explicitly **not** editable through this UI — they're environment variables on the hosting platform, referenced by settings but never displayed or stored in the database in plaintext.

## Roles in practice

Super Admin and Admin see everything above. Instructor sees only their own assigned courses, lessons, enrolled-student lists, and course-scoped analytics — structurally unable to see or edit another instructor's course, per the IDOR-prevention design in `lms-security.md`. Every sensitive action (course publish, student suspend, payment approve/refund, price change, community link change, role change) writes an `audit_logs` row automatically, visible under Audit Logs, filterable, and never editable or deletable by an ordinary admin account.
