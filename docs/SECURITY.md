# Security

This document states what was actually checked and how, not a generic
OWASP checklist recited without verification.

## Authentication

- scrypt password hashing (N=2^15, r=8, p=1 — OWASP's interactive-login
  guidance), never a fast hash, never plaintext. Verified with real
  tests (`tests/password.test.ts`): correct password verifies, wrong
  password is rejected, the hash string never contains the plaintext,
  the same password hashes differently each time (random salt), and a
  malformed stored hash fails closed rather than throwing.
- Sessions are opaque random tokens, SHA-256 hashed before storage — a
  database read alone can never be replayed as a valid cookie.
  `httpOnly`, `secure` in production, `sameSite: 'lax'`. Every
  permission check re-reads from the database on every request; nothing
  is trusted from a client-readable claim.
- Login responses are constant-shape whether or not the account exists
  (verifying against a fixed hash either way), and rate-limited by both
  IP and the attempted email address.
- No public registration route — every `admin_users` row is created by
  an existing Super Admin or the one-time seed script, from real
  operator-chosen credentials, never a hardcoded or generated-for-you
  password.

## Authorization (RBAC)

Granular, database-stored permissions, not hardcoded role checks.
Audited directly, not sampled: every exported function in every
`'use server'` file across this entire app calls
`requireAdminAction(permissionKey)` as its first line — confirmed by
grepping every server-action file and checking each export, not by
spot-checking a few. `super_admin` is granted every permission
implicitly; every other role's grants are explicit database rows.
Verified with real tests (`tests/rbac.test.ts`): a user with the right
permission is granted access, a user without it is rejected with
`ForbiddenError`, a user with no role at all is rejected, and
`super_admin`'s implicit-grant behavior works with zero
`admin_role_permissions` rows.

Earlier in this session, a live negative test also confirmed this at
the HTTP layer, not just the unit level: a seeded support-role test
user's attempt to update business settings returned a 500 with a real
`ForbiddenError`, and the database was confirmed unchanged afterward.

## Audit logging

`audit_logs` is insert-only **enforced by MySQL grants**
(`src/db/apply-grants.ts` withholds UPDATE/DELETE/DROP on that one
table specifically), not just by application code never calling those
methods. Verified with a real test: the app's own runtime database
role's attempted UPDATE and DELETE against `audit_logs` are both
rejected by MySQL itself with "command denied," confirmed via the
actual driver error, not inferred.

Never logs passwords, OAuth tokens, payment card data, or client
secrets — every call site is responsible for this (the `logAudit`
function itself does no redaction), and every current call site was
checked: none passes a password, a decrypted token, or a secret value
into `metadata`.

## Secrets and encryption

- OAuth tokens are AES-256-GCM encrypted before storage
  (`src/lib/crypto.ts`). Verified with real tests
  (`tests/crypto.test.ts`): round-trips exactly, ciphertext never
  contains the plaintext, same plaintext produces different ciphertext
  each time (random IV), and a tampered ciphertext is rejected (GCM
  authentication tag) rather than silently decrypting to garbage.
- The admin UI never renders a decrypted token — only a connected
  account's email and last-synced time.
- Every secret-gated internal/cross-app endpoint (`/api/internal/migrate`,
  `/api/internal/publish-scheduled`, `/api/public/leads-intake`,
  `/api/public/ai-questions-intake`) checks a header-supplied secret
  against an environment variable and returns 403 on any mismatch —
  verified live for each one, including the "wrong secret → 403, no
  mutation" case.
- `.env.example` contains only empty placeholders; `.env`/`.env.test`
  are gitignored; no secret value was ever committed (checked before
  every commit this session, not just assumed).

## Input validation

Every server action and public-facing route parses its input with Zod
or explicit type/length checks before touching the database — confirmed
by direct review of every action/route file.

## SQL injection

Drizzle ORM's parameterized query builder is used throughout; zero uses
of its raw `sql\`...\`` escape hatch anywhere in this app — confirmed
by a direct grep, not an assumption.

## XSS

Zero uses of `dangerouslySetInnerHTML` anywhere in this app — confirmed
by a direct grep. All rendered content goes through React's normal
escaping.

## CSRF

Every mutation is a Next.js Server Action, which carries Next's
built-in same-origin/action-id protection — the same pattern already
relied on throughout apps/learn. The one route that isn't a Server
Action and does mutate session state cross-origin by necessity (the
Google OAuth callback) is protected by an explicit, separately-verified
state-cookie check.

## SSRF

The only outbound server-initiated HTTP calls to a non-fixed host are
the Google OAuth token/API endpoints (always Google's own fixed
hostnames, never a user-supplied URL) and the cross-app leads/
AI-questions notify calls (URLs come from this app's own environment
configuration, never from request input). No endpoint in this app
accepts an arbitrary URL from a request and fetches it.

## File upload (media library)

MIME-type allowlist (JPEG/PNG/WebP/GIF/PDF only — no SVG, no
executable/script type), 10MB size limit, and the original filename is
never used for the stored path (always `<uuid>.<allowlisted-extension>`).

**Known, stated limitation**: the MIME check reads the browser-supplied
`Content-Type` header, which isn't true content-sniffing. Verified
directly: a real PHP payload sent with its real content-type is
correctly rejected; a real PHP payload sent with a *forged*
`image/png` header would be accepted and stored. What actually prevents
exploitation in that case, also verified: this app has no PHP runtime
at all (it's a Next.js/Node process, a completely separate deployment
from the Astro site's PHP form handlers), and `/api/media/[id]` always
serves the database-recorded Content-Type, not one re-derived from the
file — so such a file is returned as inert bytes, never executed.
Real magic-byte content-sniffing would close this gap more completely
and is a reasonable follow-up, intentionally not added now to avoid
pulling in an unverified new dependency for it.

## IDOR

Not the primary risk model for a staff-only admin tool the way it is
for a multi-tenant student dashboard (any authenticated admin with the
right permission is *meant* to be able to see any customer/lead/
invoice — that's the product), but every lookup that does need scoping
(e.g. a payment recorded against the invoice's own `customerId`, never
a client-supplied one) was checked to use the server-derived value, not
a trusted request parameter.

## Known gaps, stated rather than hidden

- Google Analytics/Search Console data sync isn't built (see their own
  docs) — connect/disconnect works, reading data doesn't yet.
- Business Profile rating/review count sync isn't built — the API this
  app calls doesn't return those fields.
- SEO overrides and AI knowledge sources are stored but don't yet
  affect the live public sites — each documented in its own doc.
- File upload validation checks MIME type, not file content (above).
- No automated dependency vulnerability scanning configured for this
  app specifically (beyond what the existing repo-wide pnpm overrides
  already handle for esbuild — see `pnpm-workspace.yaml`).

## Test coverage

27 automated tests (`apps/admin/tests/`), all passing against a real
local MySQL database: RBAC (5), audit-log insert-only enforcement (3),
password hashing (5), OAuth token encryption (4), invoice payment
totals (3), and blog tag/FAQ parsing (7). Run with `pnpm test`; see
`docs/ADMIN_SETUP.md`.
