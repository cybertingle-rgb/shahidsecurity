# Shahid Security Admin — Architecture

## Why a separate app, not a feature of the Astro site

Confirmed by directly reading the existing code, not assumed: `shahidiqbal.com`
is `output: 'static'` Astro deployed to Hostinger **shared** hosting
(`astro.config.mjs`'s own comment states this explicitly), with its two real
forms handled by standalone PHP scripts over Hostinger SMTP. There is no
database, no server runtime, and no session capability on that side at all.
Forcing an admin backend into that architecture isn't possible without
replacing the entire hosting setup — so, per the brief's own Section 49,
`apps/admin` is a new, separate Next.js application, deployed the same
proven way `apps/learn` (the LMS) already is on this same Hostinger
account: `output: 'standalone'`, its own Node.js App in hPanel, its own
subdomain (`admin.shahidiqbal.com`), its own GitHub Actions workflow
(`.github/workflows/deploy-admin.yml`).

The public marketing site's design, content, and deploy pipeline are
untouched by this work, beyond two small, backward-compatible additions
documented in `docs/LEADS_INTAKE.md`: the contact and booking PHP forms
now make a best-effort, non-blocking call to this app after already
sending their real email.

## Stack

- Next.js 16 (App Router, Server Actions for every mutation)
- Drizzle ORM + mysql2, against a MySQL database **entirely separate**
  from the LMS's (`shahid_security_admin_*`, never `learn_with_shahid_*`)
  — per the brief's explicit instruction not to merge them without a
  compelling reason, and there isn't one.
- scrypt password hashing, DB-backed opaque session tokens (SHA-256
  hashed before storage — a database read alone can never be replayed
  as a valid cookie), AES-256-GCM for OAuth tokens at rest.
- Tailwind v4, matching the brand tokens already established in
  `apps/learn` (itself copied from the Astro site's own design tokens),
  so the three properties look like one business.

## RBAC

Permissions are granular, database-stored rows (`admin_permissions`,
`admin_role_permissions`), never hardcoded `if (role === 'admin')`
checks. Six roles exist (seeded by `src/db/seed-super-admin.ts`):
`super_admin` (every permission implicitly, with no role_permissions
rows needed), `administrator`, `editor`, `seo_manager`, `finance`,
`support`. Every server action calls `requireAdminAction(permissionKey)`
as its first line — confirmed by direct audit: every exported function
in every `'use server'` file in this app does this, with no exception.

## Audit logging

Every sensitive mutation writes to `audit_logs`, which is insert-only
**at the MySQL grant level** (`src/db/apply-grants.ts` never grants
UPDATE/DELETE/DROP on that one table) — not just by application
convention. Verified with a real test (`tests/security.test.ts`): the
app's own runtime database role genuinely cannot UPDATE or DELETE an
audit_logs row; MySQL itself rejects the query.

## What's real vs. what's a documented gap

Several sections of this admin panel manage data that doesn't yet
affect the live public properties — stated plainly in each case, in the
UI itself and in the relevant doc, rather than implied to work:

- **SEO overrides/redirects** (`docs/`-level: see the SEO dashboard's
  own banner) — stored correctly, but shahidiqbal.com is a
  statically-generated site built separately; a build-time integration
  to actually apply these overrides isn't built yet.
- **AI knowledge sources** (`docs/AI_ASSISTANT_WORKFLOW.md`) — Luna's
  system prompt is a static constant in apps/learn; approving a source
  here doesn't yet change what Luna says.
- **Google Analytics / Search Console data sync** (`docs/GOOGLE_INTEGRATION_SETUP.md`)
  — OAuth connect works, but reading actual data needs a
  property/site-picker step not yet built. Business Profile's sync is
  real and verified against Google's actual API.

## Cross-app integrations, and why each is non-blocking by construction

- `public/api/contact.php` / `book.php` (Astro site) → `apps/admin`'s
  `/api/public/leads-intake` (`docs/LEADS_INTAKE.md`)
- `apps/learn`'s Luna chat route → `apps/admin`'s
  `/api/public/ai-questions-intake` (`docs/AI_ASSISTANT_WORKFLOW.md`)

Both are secret-gated, both no-op entirely until their secrets are
configured, and both are called *after* the calling app has already
done its real job (sent the email; answered the chat) — this app being
down, slow, or misconfigured can never break either of the other two
properties. Verified live in both directions this session, not just
described: a real HTTPS call from each source landed a real row in this
app's database.
