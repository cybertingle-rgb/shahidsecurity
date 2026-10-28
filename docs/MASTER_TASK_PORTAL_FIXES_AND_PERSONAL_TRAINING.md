# Portal error fix, course CRUD/deletion, and Personal Training — completion report

Branch: `claude/wizardly-keller-yg0bj7`. Covers the full "MASTER TASK" brief: the
recurring portal error, course CRUD/safe-deletion, the Personal Training
pathway, and its prominent placement across Learn with Shahid.

## 1. Root cause of the recurring "This page couldn't load" error

Investigated across both apps' request lifecycle, auth, DB connections,
Server Actions, caching/revalidation, and deployment config. The
`redirect()`-caught-in-try/catch anti-pattern (a common cause of this exact
symptom) was explicitly ruled out: all 20 call sites across both apps were
read, and none wrap `redirect()` in a try/catch.

Two real, concrete contributing factors were found instead, and both are
fixed:

- **No error boundary existed anywhere in either app.** Neither app had an
  `error.tsx` or `global-error.tsx` at any level. Next.js's own default
  behavior when no `errorComponent` is configured is to render bare children
  with no fallback (`node_modules/next/dist/client/components/error-boundary.js`
  — confirmed by reading the installed Next.js source) — so *any* transient
  error (a dropped DB connection, a brief network blip, a stale RSC payload)
  had no graceful recovery path and surfaced as the generic, unrecoverable
  page failure the user described. A reload working afterward is exactly
  what you'd expect if the underlying condition (e.g. a momentarily
  exhausted DB pool) had already cleared by the time the user retried.

- **The MySQL connection pool size (`connectionLimit: 3`) was too low for
  real traffic.** This had been reduced from an original 10 in an earlier
  session phase to fight OOM crashes on a memory-constrained host. In
  practice, at least 15 admin pages run 3+ concurrent queries per render via
  `Promise.all` (e.g. `dashboard/configurations/page.tsx`), so a single page
  view could exhaust a 3-connection pool on its own. mysql2's default
  behavior when a pool is exhausted is to **queue** the request rather than
  fail it — and combined with Hostinger's confirmed ~120-second request
  timeout, a queued request could sit long enough to be killed by the host,
  surfacing as exactly the "page errors, reload fixes it" pattern reported.

**What could not be verified:** this session has no access to
admin.shahidiqbal.com's production logs or console output, so the exact
queued-request-timeout sequence could not be directly observed on the live
site. The fixes above address the two structural gaps that match the
reported symptom and were positively confirmed in this codebase; they are
the best evidence-based explanation achievable without production log
access, not a claimed reproduction of the live incident.

### Fixes applied

- `apps/admin/src/app/error.tsx`, `apps/admin/src/app/global-error.tsx`
- `apps/learn/src/app/error.tsx`, `apps/learn/src/app/global-error.tsx`,
  `apps/learn/src/app/dashboard/error.tsx`
- `apps/admin/src/db/index.ts`, `apps/admin/src/db/learnDb.ts`,
  `apps/learn/src/db/index.ts`: `connectionLimit` raised from 3 to 8 (real
  headroom below the original 10, while covering the actual concurrent-query
  shape observed in the code).

None of these loosen validation, suppress errors globally, add artificial
delays, or hide failures — each `error.tsx` surfaces a real "Try again" /
"Go to dashboard" recovery action and logs the error via `console.error`.

## 2. Course CRUD and safe deletion

Audited `apps/admin/src/app/dashboard/learn/courses/` — create, edit,
publish/review/archive status transitions, and module/lesson CRUD already
existed and worked. The one real gap was **deletion**.

### Safe course deletion

- `apps/admin/src/lib/learn/courses.ts`: `getCourseDeletionStatus(courseId)`
  — checks real enrollment count (`enrollments.courseId`) and the linked
  product's real order count (`orders.productId`, via the course's product)
  before allowing a hard delete. Both tables already carry an intentional
  `onDelete: 'restrict'` database-level backstop in this codebase
  specifically to prevent this — the new check surfaces *why* up front
  instead of letting the UI hit a raw constraint violation.
- `apps/admin/src/app/dashboard/learn/courses/actions.ts`: `deleteCourse(id)`
  — re-checks both conditions **again inside the delete transaction**
  (closes the race window between the page load and the submit — e.g. a
  free-enrollment landing in between), deletes the linked product (which
  has no history) and the course together, logs an audit entry, and
  revalidates the courses list.
- `apps/admin/src/app/dashboard/learn/courses/[id]/page.tsx`: a "Danger
  zone" section — shows a real delete button when safe, or an explanatory
  message naming the actual enrollment/order counts and pointing to
  **Archive** instead when not.

A course/product with any real history is **never** hard-deletable by this
code path — archiving remains the only way to remove it from the public
catalog while preserving student and payment history, matching this
project's existing documented retention policy.

Verified end-to-end against a real local MySQL database (not mocked): both
the safe-delete and blocked-delete paths, plus 7 automated regression tests
(`apps/admin/tests/learnCourses.test.ts`).

### Other admin CRUD sections (audited, not all needed changes)

Audited: business/services, learn/products, learn/payment-methods,
learn/enrollments, learn/students, learn/orders, payments, payments/methods,
content/blog, testimonials/review-requests, configurations, users. All were
already complete and correctly gated, with one real gap:

- **`learn/payment-methods`'s `deletePaymentMethod` hard-deleted
  unconditionally.** `payments.paymentMethodId` is `onDelete: 'set null'`,
  so deleting a method that a real bank-transfer or crypto payment had used
  would silently erase which method a historical payment record used —
  fixed in `apps/admin/src/app/dashboard/learn/payment-methods/actions.ts`
  to check real payment history first and refuse (directing the admin to
  deactivate instead) when any exists, mirroring `getCourseDeletionStatus`.

Every other section's create/edit/delete-or-archive was already present,
server-side-authorized (`requireAdminAction` / `requirePermission` — never
just a hidden button), and used archive/deactivate rather than hard delete
wherever real financial or student history could exist.

## 3. Personal Training — data model

New table, additive-only migration, no existing table touched:

- `apps/learn/src/db/schema/support.ts` (source of truth) and
  `apps/admin/src/db/schema/learn/support.ts` (mirrored copy, kept
  byte-identical per this codebase's existing convention — Learn's schema
  only ever migrates from `apps/learn` itself): new `training_requests`
  table.
- Migration: `apps/learn/drizzle/0005_worthless_wild_child.sql` — one
  `CREATE TABLE` plus its four foreign keys. Nothing else changes.

**The pricing rule is enforced structurally, not by convention.** The
"Personal Training" product (`apps/learn/src/lib/personalTraining.ts`,
`ensurePersonalTrainingProduct()`) is a real row in the existing `products`
table (`type: 'mentoring'`, a value already present in that enum, previously
unused) — but it **never gets a row in `prices`**, ever. That absence (not
a `$0` amount, not a placeholder, not a borrowed course price) is how an
unconfigured/not-yet-announced price is represented, reusing the existing
products/prices model rather than adding a nullable price column. The
practical effect: `getPurchasableProduct()` (the function every self-serve
checkout path in this app calls) can never resolve a price for this
product, so **the ordinary catalog checkout path can never be reached for
it** — verified directly in `apps/learn/tests/personalTraining.test.ts`
("can never be bought through the ordinary catalog checkout path").

A specific price is only ever recorded once Shahid and the student have
actually agreed on one, on the `training_requests` row itself
(`agreedPriceAmount`/`agreedCurrencyCode`) — and setting it never creates a
charge. It only becomes a real order once the student explicitly accepts
(see §4).

## 4. Personal Training — student request flow

- `apps/learn/src/app/personal-training/page.tsx` — public offering page:
  description, what's included, explicit "no price is shown here on
  purpose" note, and a CTA that routes to login-then-request for a signed
  out visitor.
- `apps/learn/src/app/dashboard/personal-training/page.tsx` — the request
  form (name/email prefilled from the student's own profile, area of
  interest, experience level, goals, optional format preference/preferred
  availability/special request) and a list of the student's own past
  requests with live status. Submitting **never creates an order, payment,
  or price row** — confirmed by test.
- `apps/learn/src/lib/personalTraining.ts`:
  `submitTrainingRequest()` (server-side validation independent of the
  client form), `listMyTrainingRequests()` / `getMyTrainingRequest()`
  (ownership-scoped — a request ID that isn't the caller's own userId's
  returns `null`, the same IDOR-safe pattern this codebase already uses for
  courses/lessons; both deliberately never select `internalNotes`),
  `acceptTrainingRequestOffer()`.
- **Accept-and-pay**
  (`apps/learn/src/app/dashboard/personal-training/[id]/accept/page.tsx`) —
  only reachable once an admin has set `agreedPriceAmount` and the status is
  `approved`. Reuses the exact same manual-payment UI/flow (payment method
  selection, QR code, transaction reference, receipt link) the regular
  course checkout already uses, charging exactly the agreed amount — not a
  catalog price, since none exists. This is the one and only point where a
  real order/payment/`manual_payment_submissions` row is created, and it
  requires the student's own explicit submit action. An admin review (the
  existing `approveManualPayment` flow, unchanged) still gates actual
  access, same as every other manual payment in this app.
- Re-accepting an already-converted request, or a non-owner attempting to
  accept someone else's request, are both explicitly refused and covered by
  tests.

## 5. Personal Training — admin management

- `apps/admin/src/lib/learn/trainingRequests.ts` — `listTrainingRequests()`
  (optionally filtered by status), `getTrainingRequest()` (full detail,
  including `internalNotes` — admin-eyes-only, never selected by any
  student-facing query), `setTrainingRequestStatus()`,
  `setTrainingRequestInternalNotes()`, `setTrainingRequestAgreedPrice()`.
- `apps/admin/src/app/dashboard/learn/training-requests/` — list page
  (filterable by status: New / Reviewing / Contacted / Approved / Declined
  / Converted) and a detail page: full request content, a status dropdown,
  an agreed-price form, and an internal-notes textarea never shown to the
  student.
- Every mutation goes through `requireAdminAction()` (this app's existing
  Learn-admin auth guard) and writes an audit log entry
  (`logLearnAudit`) — `training_request.status_changed`,
  `training_request.price_agreed`, `training_request.notes_updated` — so
  the full status-change history is preserved, satisfying the brief's audit
  trail requirement without a bespoke table.
- **A `converted` request can never have its status or agreed price changed
  again** — enforced server-side in the lib functions, not just hidden in
  the UI (the detail page also disables those controls, but the real
  enforcement is in `setTrainingRequestStatus`/`setTrainingRequestAgreedPrice`
  themselves) — so the audit trail can never desync from money that has
  already moved.
- Setting a price never flips the status to `approved` automatically — that
  stays a deliberate, separate admin action, so a price jotted down
  mid-discussion never half-surfaces to the student before the admin means
  it to.

## 6. Prominent placement (within this repository's scope)

This repository contains `apps/admin` and `apps/learn` only — the separate
Shahid Security marketing site (shahidiqbal.com) is a different codebase
this session has no access to, so its homepage/promo section could not be
changed. Everything else the brief named:

- `apps/learn/src/app/page.tsx` — a new two-pathway section right after the
  hero: "Explore Courses" / "Personal Training" cards, each with its own CTA
  and supporting copy, before the existing course grid.
- `apps/learn/src/components/PublicHeader.tsx` — "Personal Training" added
  to the main site nav, next to "Browse Courses", on every public page.
- `apps/learn/src/app/courses/page.tsx` — a "Don't see what you're after?"
  CTA at the bottom of the course catalogue linking to Personal Training.
- `apps/learn/src/app/dashboard/layout.tsx` — "Personal Training" added to
  the student dashboard sidebar nav, right under "My Courses".
- `apps/admin/src/app/dashboard/_components/nav-config.ts` — "Personal
  Training" added to the admin Learn-section sidebar, right under
  "Courses" — not buried.
- `apps/learn/src/app/sitemap.ts` — `/personal-training` added as an
  indexable public URL.

No fixed price, session count, delivery method, or outcome is claimed
anywhere in this copy — every mention of pricing explicitly says it's
discussed and agreed before anything is booked.

## 7. Testing

New automated tests, run against a real local MySQL database (not mocked):

- `apps/admin/tests/learnCourses.test.ts` (7 tests) — `getCourseDeletionStatus`
  and the exact `deleteCourse` transaction logic: safe delete, blocked by a
  real enrollment, blocked by a real order on the linked product with zero
  enrollments.
- `apps/admin/tests/learnTrainingRequests.test.ts` (9 tests) — status
  workflow, converted-request immutability, agreed-price validation
  (rejects zero/negative amounts), internal notes.
- `apps/learn/tests/personalTraining.test.ts` (11 tests) — product
  creation is idempotent and never gets a price row, the catalog checkout
  path can never resolve it, request submission validation, ownership/IDOR
  (one student can never read another's request), accept-offer creates an
  order at exactly the agreed amount, refuses when not approved, refuses a
  second accept on an already-converted request (no duplicate order),
  refuses a non-owner's accept attempt.

Pre-existing suites were re-run as a regression check and all still pass
unmodified.

### Final results (this session, local MySQL test databases)

| App | Tests | Typecheck | Build | Lint |
|---|---|---|---|---|
| apps/admin | **143/143 pass** (134 pre-existing/updated + 9 new) | clean | succeeds | 2 pre-existing failures (see below) |
| apps/learn | **95/95 pass** (84 pre-existing + 11 new) | clean | succeeds | 6 pre-existing failures (see below), incl. 1 new file hitting the same gap |

**Lint note (pre-existing, not introduced this session):** this sandbox's
ESLint config can't resolve the `@next/next/no-img-element` and
`react-hooks/exhaustive-deps` rule definitions when linting certain files —
reproduced identically on files this session never touched (e.g.
`CourseCard.tsx`, `ThumbnailUrlField.tsx`, the pre-existing checkout page).
One new file (`personal-training/[id]/accept/page.tsx`) hits the same gap
for the same reason — it copies the pre-existing checkout page's own
`eslint-disable` comment for a generated `<img>` data URL. This is an
environment/plugin-resolution issue in this sandbox, not a real violation;
whether it reproduces in the actual CI/deploy environment should be
confirmed there.

### Not verified (requires a browser, out of scope for this session)

Duplicate-submission prevention (disabling a submit button while a request
is in flight), focus/keyboard-navigation behavior, and visual responsive
layout were not verified in an actual browser — this session has no
browser automation available. The server-side logic that matters most
(re-entrancy: `acceptTrainingRequestOffer` refusing a second accept on an
already-converted request) **is** covered by an automated test, independent
of whether a double-click is also prevented client-side.

## 8. Files changed / added

**Fix (P1):** `apps/admin/src/app/error.tsx`, `apps/admin/src/app/global-error.tsx`,
`apps/learn/src/app/error.tsx`, `apps/learn/src/app/global-error.tsx`,
`apps/learn/src/app/dashboard/error.tsx`, `apps/admin/src/db/index.ts`,
`apps/admin/src/db/learnDb.ts`, `apps/learn/src/db/index.ts`.

**Course CRUD (P2):** `apps/admin/src/lib/learn/courses.ts`,
`apps/admin/src/app/dashboard/learn/courses/actions.ts`,
`apps/admin/src/app/dashboard/learn/courses/[id]/page.tsx`,
`apps/admin/src/app/dashboard/learn/payment-methods/actions.ts`.

**Personal Training (P3/P4):**
`apps/learn/src/db/schema/support.ts`,
`apps/admin/src/db/schema/learn/support.ts`,
`apps/learn/drizzle/0005_worthless_wild_child.sql` (+ its `meta/` snapshot),
`apps/learn/src/lib/personalTraining.ts`,
`apps/learn/src/lib/checkout.ts` (exported `generateOrderNumber`),
`apps/learn/src/app/personal-training/page.tsx`,
`apps/learn/src/app/dashboard/personal-training/page.tsx`,
`apps/learn/src/app/dashboard/personal-training/actions.ts`,
`apps/learn/src/app/dashboard/personal-training/[id]/accept/page.tsx`,
`apps/learn/src/app/dashboard/personal-training/[id]/accept/actions.ts`,
`apps/learn/src/app/dashboard/layout.tsx`,
`apps/learn/src/app/page.tsx`,
`apps/learn/src/app/courses/page.tsx`,
`apps/learn/src/components/PublicHeader.tsx`,
`apps/learn/src/app/sitemap.ts`,
`apps/admin/src/lib/learn/trainingRequests.ts`,
`apps/admin/src/app/dashboard/learn/training-requests/page.tsx`,
`apps/admin/src/app/dashboard/learn/training-requests/[id]/page.tsx`,
`apps/admin/src/app/dashboard/learn/training-requests/actions.ts`,
`apps/admin/src/app/dashboard/_components/nav-config.ts`.

**Tests:** `apps/admin/tests/learnCourses.test.ts`,
`apps/admin/tests/learnTrainingRequests.test.ts`,
`apps/learn/tests/personalTraining.test.ts`,
`apps/admin/vitest.config.ts` (added `LEARN_DATABASE_URL` to the test env so
`learnCourses.test.ts`/`learnTrainingRequests.test.ts` can reach apps/learn's
own test database — documented inline as not safe to run concurrently with
apps/learn's own `pnpm test` against the same database).

## 9. Schema change / deployment note

One additive migration only: `apps/learn/drizzle/0005_worthless_wild_child.sql`
(`CREATE TABLE training_requests` + 4 foreign keys). No existing table is
altered. Deploying this change requires the normal Learn migration step
(`pnpm db:migrate` from `apps/learn`, or whatever the existing deploy
pipeline already runs) to pick it up, followed by `pnpm db:apply-grants`
(idempotent — safe to re-run) so the app's narrow runtime user gets
SELECT/INSERT/UPDATE/DELETE on the new table, matching every other
application table. Both are already standard steps in this project's
existing deploy process — nothing new was added to that process itself.

## 10. Remaining limitations

- The Shahid Security marketing site's homepage/promo section is outside
  this repository and could not be changed (see §6).
- Production log/console access for admin.shahidiqbal.com remains
  unavailable, so the P1 root cause is the best evidence-based explanation
  achievable from the codebase itself, not a confirmed live reproduction
  (see §1).
- Browser-level behavior (duplicate-submission button disabling, focus
  states, responsive layout) was not verified in an actual browser this
  session (see §7).
