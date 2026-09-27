# Learn with Shahid — Security Architecture

**Status:** proposal. This is a cybersecurity company's own product — the standard here is "would we accept this in a client's environment," not "good enough for a side project."

## Authentication

- **Password hashing**: argon2id (via the auth library, not hand-rolled). Never plaintext, never reversible encryption, never a fast hash like plain SHA-256.
- **Session model**: server-side sessions (a `sessions` table row per active session, referenced by an opaque token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie) rather than a stateless JWT for the main session — this makes "log out everywhere" and "revoke a suspicious session" trivial database operations instead of requiring a token-blocklist workaround.
- **Email verification**: required before a new account can enroll in anything paid (free browsing of `/learn/*` marketing pages needs no account at all). Verification link is a single-use, time-limited token, not a guessable code.
- **Password reset**: single-use, short-lived (≤ 1 hour) token emailed to the account's verified address; resetting invalidates all existing sessions for that user.
- **Rate limiting & brute-force protection**: per-IP and per-account limits on login, registration, and password-reset-request endpoints (e.g. a sliding-window limiter backed by the database or Redis once introduced). Repeated failures from one account or IP escalate to a temporary lockout with exponential backoff, logged to `auth_events`.
- **Suspicious login detection**: flag (not necessarily block) a login from a new country/device combination for a given user, surfaced in `auth_events` and, later, as an optional "new device" email notice — kept simple in V1, not a full risk-scoring engine.
- **CSRF**: for any state-changing request driven by a classic form POST, a CSRF token tied to the session; for the JSON API surface the app's own frontend calls, same-origin + `SameSite=Lax` cookies plus explicit origin checking on mutating requests covers the realistic threat model without over-engineering a separate token scheme for every fetch call.

## Authorization (RBAC)

- Permissions are checked **server-side, on every request**, by reading the requesting user's roles/permissions from the database (or a short-lived server-side cache of them) — never by trusting a role claim embedded in a client-readable cookie or local storage value.
- Every admin route and every API route that touches another user's data does an explicit ownership/permission check as the *first* thing it does, before any business logic runs. Pattern: `requirePermission(session, 'courses.update')` at the top of the handler, not scattered `if` checks deep in the function.
- **IDOR prevention is a first-class design constraint, not an afterthought**: any endpoint that takes an ID (a lesson, an order, a certificate) must verify the *current user* is entitled to that specific record — e.g. `enrollments` lookups are always scoped by `WHERE user_id = current_user_id AND id = :id`, never just `WHERE id = :id`. This is exactly the "Student A must not access Student B's data" requirement from the brief, and it's a query-shape discipline, not a special library.
- Instructor scope: an instructor's queries for "my courses" are scoped by `instructor_id = current_user.instructor_profile.id`, so one instructor structurally cannot see or edit another's course data — enforced the same way as student scoping, not by a separate mechanism.

## Payment & webhook security

- **Never trust the frontend for payment status.** The order is only marked `paid` after either (a) a verified webhook from the payment provider whose signature has been validated against the provider's documented scheme, or (b) an admin's explicit manual-payment approval action (itself logged to `audit_logs`).
- **Idempotency**: every payment-creation and webhook-handling code path is idempotent — a `payments.idempotency_key` unique constraint means a retried webhook or a double-submitted checkout can't create a duplicate paid order or double-grant enrollment.
- **Webhook endpoints** are not secret-by-obscurity: they validate the provider's signature header on every request and reject anything that doesn't match, independent of whether the URL is guessable.
- **Coupon abuse**: enforced at the database level (unique constraints on `coupon_usage`, checked inside the same transaction that creates the order), not just in application code that a race condition could slip past.
- **Price integrity**: the price charged is always the server-side lookup described in `lms-database.md`'s `prices` table — a manipulated price in a client request is simply never read for anything that affects what gets charged or unlocked.

## File upload security

Applies to payment receipts, assignment submissions, and any course resource an instructor uploads:

- Validate **content**, not just filename extension — check the actual file signature/MIME type server-side.
- Enforce a size limit per upload type (a receipt screenshot and a course PDF have different reasonable limits).
- Sanitize filenames before storage; store under a generated name, not the user-supplied one.
- Store uploads in a location the web server doesn't execute as code, and outside any path where they could be served as a different content-type than intended (a classic bypass for "we validated the extension" mistakes).
- Where the hosting platform offers it, run uploaded files through a malware scan before they're accepted; if that's not available at launch, document it as a known gap rather than silently skipping it.

## Admin-specific hardening

- **MFA for admin and super-admin roles** as soon as the auth library in use supports it cleanly (most modern auth libraries do via TOTP) — flagged in the implementation plan as a Phase 2/3 item, not deferred indefinitely.
- **Shorter session lifetime for admin sessions** than student sessions.
- **Every sensitive admin action is written to `audit_logs`** in the same database transaction as the action itself (course created/updated, student suspended, payment approved/refunded, price changed, community link changed, role changed) — so the log can't drift out of sync with what actually happened.
- Audit logs are **insert-only** for the application's normal database role (see `lms-database.md`) — no admin UI ever exposes a delete action for them.

## Secrets & configuration

- All credentials (database URL, payment provider keys, email provider API key, session secret) live in the hosting platform's environment variable store — never committed to the repository, never sent to the browser, never logged.
- Payment provider **secret** keys are used only in server-side code; any **publishable/public** key a payment widget needs client-side is the only credential that ever reaches the browser, exactly mirroring how `PUBLIC_TURNSTILE_SITE_KEY` is already handled on the existing site.
- Private community invite links are stored in the database and only ever rendered to a user whose `community_access.status` is `invited`/`joined` for that specific community — never included in any public or unauthenticated API response, and never present in the static marketing site's source at all.

## Baseline web security hygiene

Standard OWASP-aligned controls, applied consistently rather than listed as an aspiration:

- Output encoding everywhere user-generated content is rendered (assignment submissions, support ticket messages) to prevent stored XSS.
- Parameterized queries / ORM-generated SQL only — no string-concatenated queries anywhere, which also means no raw SQL string building from request input.
- Security headers on every response (the same HSTS/X-Content-Type-Options/Referrer-Policy/X-Frame-Options/Permissions-Policy/COOP set already applied on the marketing site's `.htaccess`, replicated at the LMS app's hosting layer).
- Generic, non-leaky error pages/responses in production — stack traces and internal error detail are logged server-side, never returned to the client.
- Dependency auditing (`npm audit`/equivalent) as a routine step before each deploy, not a one-time setup task.

## What "secure" does not mean here

This document does not claim the finished system will be immune to compromise — no system is. It commits to a specific, testable set of controls (listed above and expanded into concrete test cases in the Phase 14 testing plan referenced from `LMS_IMPLEMENTATION_PLAN.md`), and to a pre-launch security review pass (authentication, authorization, IDOR, CSRF, XSS, SQL injection, file upload, payment manipulation, webhook security, session security, admin access, rate limiting, secrets, dependencies, headers, error handling, privacy) before any real payment credentials go live, per the brief's own "security review before deployment" section.
