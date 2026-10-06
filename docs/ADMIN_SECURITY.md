# Admin security reference

Referenced from several code comments as "once written" across earlier
phases — this is that doc, covering the permission model, the Phase 18
publish/Google audit events, and what the Phase 18U security review
covered.

## Permission model

Permissions are rows in `admin_permissions`, granted to roles via
`admin_role_permissions` (`src/lib/rbac.ts`). `super_admin` implicitly
has every permission — never via rows, so there's nothing to misconfigure
there. Every other role's grants are explicit, seeded in
`src/db/seed-super-admin.ts`'s `ROLE_PERMISSIONS`.

Publishing to the live public site and rolling back a deployment are
**not** part of the general content-management permissions
(`blog.manage`, `seo.manage`) that Editor/SEO Manager already hold —
per Phase 18U, they're separate, narrower permissions:

| Permission | What it allows | Granted to |
|---|---|---|
| `content.publish` | Commit a blog post to the live site | `administrator`, `super_admin` |
| `seo.publish` | Commit an SEO override to the live site | `administrator`, `super_admin` |
| `deployment.rollback` | Restore a publication's previous commit | `administrator`, `super_admin` |

Editor, SEO Manager, Finance, and Support do **not** have any of these
three — they can edit content and the CMS's own draft/published flag,
but cannot push anything to the live site or undo a deployment. A role
needing this capability must be granted it explicitly (re-run
`db:seed-super-admin` after adding it to `ROLE_PERMISSIONS`, or grant it
through the roles UI once one exists).

Every Server Action that touches privileged data calls
`requireAdminAction(permissionKey)` as its first line (`src/lib/guard.ts`)
— a missing call fails loudly (the action throws `UnauthenticatedError`
or `ForbiddenError`) rather than silently succeeding, and this isn't the
only check: the dashboard layout already blocks a signed-out request
from rendering these pages at all.

## Audit events (Phase 18)

Every publish/deployment/rollback/Google-selection action writes to
`audit_logs` (insert-only at the database level — see
`src/db/apply-grants.ts`). None of these ever include an OAuth token,
access/refresh token, or GitHub credential in their metadata — only
ids, slugs/paths, and commit SHAs.

| Action | Written by |
|---|---|
| `BLOG_PUBLISHED` | `publishBlogPostToWebsite` on a successful commit |
| `SEO_PUBLISHED` | `publishSeoOverrideToWebsite` on a successful commit |
| `DEPLOYMENT_FAILED` | Either publish function, on any failure (validation or GitHub API) |
| `DEPLOYMENT_SUCCEEDED` | `refreshPublicationStatus`, once the real GitHub Actions run reports success |
| `DEPLOYMENT_ROLLBACK` | `rollbackBlogPublication` |
| `GOOGLE_PROPERTY_CHANGED` | Search Console / Analytics property selection |
| `GOOGLE_LOCATION_CHANGED` | Business Profile location selection |

Separately, `google_sync_logs` (not `audit_logs`) records the
success/failure of each Google sync/selection attempt specifically,
including the real error message, for the Connections Center's
"Last error" display — see `docs/GOOGLE_SEARCH_CONSOLE.md` et al.

## Phase 18U security review

Reviewed the publish pipeline and the three Google pickers against:
SSRF, path traversal, content/script/template injection, IDOR,
privilege escalation, OAuth-token leakage into logs or error messages,
and publish replay/races.

**One real issue found and fixed:** `rollbackBlogPublication` didn't
check a publication's `contentType` before treating its
`targetSlugOrPath` as a blog slug — an `seo_page` publication's id
passed into it would build a nonsensical blog file path. Fixed with an
explicit check; covered by a test.

**Everything else checked out by construction, not by inspection alone:**

- Every file path (`src/content/blog/<slug>.mdx`, the fixed SEO-overrides
  path) is built from a slug validated against a `^[a-z0-9-]+$`-style
  pattern or a fixed constant — never from an unvalidated path segment,
  so there's no traversal vector.
- Every GitHub/Google API call targets a fixed hostname; the only
  user-influenced part of any URL is a slug/site/property/account/
  location id, and each of those is re-validated against that account's
  real, API-returned accessible list before being used — a tampered
  form value naming something the authenticated account doesn't own is
  rejected, not trusted.
- Content is rejected outright (never stripped-and-allowed) for any
  HTML tag, script, MDX expression, or JSX component —
  `src/lib/publish/sanitize.ts`.
- Error messages thrown by the GitHub/Google client wrappers only ever
  include the HTTP status and the response body text — never the
  request's Authorization header — so a thrown error can't leak a
  token into an audit log or the admin UI.
- Two concurrent publishes of the same file can't silently clobber each
  other: `commitFile`/`restoreFileToCommit` pass the file's current blob
  SHA to GitHub's Contents API, which itself rejects a stale SHA — the
  loser of a race gets a real error to retry, not silent data loss.

**Not reviewed because it doesn't exist yet:** any write/manage
capability for Google Business Profile (posts, reviews, name/address
edits) — see `docs/GOOGLE_BUSINESS_PROFILE.md`'s read/write separation
section for what a future write feature would need to do differently.
