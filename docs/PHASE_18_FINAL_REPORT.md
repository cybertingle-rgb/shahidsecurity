# Phase 18 Final Report — Admin → Live Website + Google Integrations

## 1. What was already implemented (before Phase 18)

A 17-phase Next.js admin CMS (`apps/admin`) separate from the static
Astro marketing site and the `apps/learn` LMS: authentication/RBAC/audit
logging, business settings, Services CRUD, a Blog CMS (draft/scheduled/
published status — admin-side only), an SEO control center (per-page
title/description/canonical/robots overrides — admin-side only), leads/
consultations management, payments/invoices, testimonials and review
requests, Google OAuth connect/disconnect for three scopes (Business
Profile, Analytics, Search Console) with encrypted token storage, a
media library, an AI-assistant knowledge workflow, and a security
hardening/test/documentation pass. Critically, none of this actually
changed the live `shahidiqbal.com` site — "publishing" a blog post or an
SEO override only ever flipped a flag in the admin's own database.

## 2. What Phase 18 added

- A real git-commit-based publish pipeline connecting the admin to the
  live Astro site, with tracked publish attempts, rollback, and status
  polling against the real GitHub Actions run.
- Property/location pickers for all three Google integrations, each
  following a select → re-validate → test → save flow, replacing
  either a missing feature (Search Console, Analytics) or a "take the
  first result" shortcut (Business Profile).
- A real top-pages/top-queries performance view for Search Console and
  Analytics, and a disclosed, non-promissory SEO-opportunities heuristic.
- A Google Connections Center (status/account/last-sync/last-error per
  integration) and a rebuilt central dashboard showing real integration
  health — replacing a dashboard home page that was still the literal
  Phase 1 scaffold stub.
- New, narrower RBAC permissions (`content.publish`, `seo.publish`,
  `deployment.rollback`) separate from the general content-management
  permissions, granted only to Administrator/Super Admin.
- A security review of all of the above, one real bug found and fixed
  (see §8), and a written production smoke-test script.
- Fixed two pre-existing bugs surfaced while building this: overly
  broad local database grants that silently masked the audit-log
  insert-only test, and a `refreshGoogleAccessToken` function that
  existed but was never called anywhere (meaning any Google API call
  after ~1 hour would have silently used a dead token).

## 3. Public-site publishing architecture

Publishing = a real commit to the exact branch
`.github/workflows/deploy.yml` already watches. The admin never talks to
a database the public site reads at runtime — it writes a file
(`src/content/blog/<slug>.mdx`, or merges into
`src/data/seo-overrides.generated.json`) via the GitHub Contents API,
inheriting the existing pipeline's build-before-deploy safety for free
rather than re-implementing it. Every attempt is tracked in a new
`publications` table (`publishing` → `building` → `published`/`failed`,
with the real commit SHA, the commit it replaced, and the GitHub Actions
run id once known). Rollback restores the previous commit's content as
a new forward commit — never a history rewrite. Content is validated
and sanitized (reject-outright, not strip-and-allow) before any commit
is attempted. Full detail: `docs/ADMIN_PUBLIC_SITE_INTEGRATION.md`,
`docs/CONTENT_PUBLISHING.md`, `docs/ROLLBACK.md`.

**Live-untested**: no `GITHUB_TOKEN` exists in this environment, so no
actual commit has ever been pushed to the real repo by this code. Unit
and integration tests (with the GitHub client mocked) verify the logic;
the real GitHub API call path has not been exercised.

## 4. Google Analytics status: Implemented

Property picker (`accountSummaries.list`) + real report query
(`runReport`) + timezone/currency read from the real property, all
through a select-then-test-then-save flow. Dashboard shows real top
pages (views, active users) for the last 28 days. Live-untested (no
`GOOGLE_CLIENT_ID`/`SECRET` in this environment). Detail:
`docs/GOOGLE_ANALYTICS.md`.

## 5. Search Console status: Implemented

Property picker (`sites.list`) + real Search Analytics queries, same
select-then-test-then-save flow. Dashboard shows real top queries/pages
for the last 28 days, plus a disclosed CTR-vs-position heuristic
flagging possible title/meta-description issues — explicitly not a
ranking promise, never an automatic edit. This is the one integration
your own note correctly identified as needing no special Google
approval — only standard API enablement. Live-untested for the same
credential reason as above. Detail: `docs/GOOGLE_SEARCH_CONSOLE.md`.

## 6. Business Profile status: NEEDS_CONFIGURATION (blocked on you)

Code is ready: account/location picker (never takes the first result
anymore), test-then-save, "Sync now" re-reads only the saved selection.
Rating/review count remain genuinely unpopulated — the Business
Information API this integration uses doesn't return them, and no
unverified guess was shipped in their place. As your own note said,
Google requires you to complete Cloud Console configuration/approval
for this API yourself, with no sandbox — this session cannot do that
step. Detail: `docs/GOOGLE_BUSINESS_PROFILE.md`.

## 7. Deployment architecture

Two independent pipelines, documented separately so they're never
confused: (a) deploying `apps/admin` itself (`docs/DEPLOYMENT.md`,
mostly pre-existing, not changed this phase beyond a clarifying note),
and (b) the public Astro site's existing build-then-deploy GitHub
Actions workflow, which Phase 18's publish pipeline commits into rather
than replacing. A failed `pnpm build` (includes typecheck) already
structurally blocks the deploy step in that workflow — Phase 18T's
"failed build can't reach production" requirement was already true
before this phase and is inherited, not rebuilt.

## 8. Security controls

RBAC: `content.publish`/`seo.publish`/`deployment.rollback` are
separate from `blog.manage`/`seo.manage`, granted only to
Administrator/Super Admin (not Editor/SEO Manager/Finance/Support).
Every new Server Action calls `requireAdminAction(permission)` as its
first line. Content sanitization rejects raw HTML/scripts/MDX
expressions outright. Every picker re-validates a submitted id against
the real, API-returned accessible list before using it. File paths are
built only from regex-validated slugs or fixed constants — no traversal
vector. Credentials are never logged; thrown error messages include
only HTTP status and response body, never request headers.

**One real bug found during review and fixed**: `rollbackBlogPublication`
didn't check a publication's `contentType` before treating its
`targetSlugOrPath` as a blog slug, so an `seo_page` publication's id
passed into it would have built a nonsensical blog file path. Fixed
with an explicit check, covered by a new test. Full write-up:
`docs/ADMIN_SECURITY.md`.

## 9. Tests

100 tests across the admin app, all passing at the last full run, all
run against the real local test database, none mocked for the database
layer. New this phase: content rendering/validation (blog + SEO
override), the GitHub publish/rollback orchestration (GitHub client
mocked, database real), Search Console/Analytics/Business Profile API
clients (fetch mocked), the SEO-opportunity heuristic, and Google
sync-error logging. `pnpm test`/`pnpm typecheck`/`pnpm lint`/`pnpm build`
all pass as of the last commit.

## 10. Files changed

11 commits, 64 files (63 plus the `.env.example` follow-up), ~12,900
lines added. Full list: `git log --stat f089e33..HEAD` in this repo (or
browse the 11 commits directly on the `claude/wizardly-keller-yg0bj7`
branch). Highlights: `apps/admin/src/lib/github/*`,
`apps/admin/src/lib/publish/*`, `apps/admin/src/lib/google/*`,
`apps/admin/src/app/dashboard/google/**`, `apps/admin/src/app/
dashboard/page.tsx`, two new Drizzle migrations plus one schema-fix
migration, 8 new test files, and 7 updated/new docs.

## 11. Environment variables required (not yet set anywhere)

```
GITHUB_TOKEN=            # fine-grained PAT or GitHub App installation token
GITHUB_REPO_OWNER=cybertingle-rgb
GITHUB_REPO_NAME=shahidsecurity
GITHUB_REPO_BRANCH=      # whatever branch deploy.yml deploys from

GOOGLE_CLIENT_ID=        # already documented pre-Phase-18; still unset
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
TOKEN_ENCRYPTION_KEY=
```

All four `GITHUB_*` vars are new this phase, now documented in
`apps/admin/.env.example`. The `GOOGLE_*` vars predate this phase but
remain unset — every "Connect"/"Publish" button in the admin stays
correctly disabled until they are.

## 12. Hostinger configuration required

None new from this phase specifically — `docs/DEPLOYMENT.md` (pre-
existing, for `apps/admin` itself) and the existing `deploy.yml` (for
the public site) cover what's already needed. The publish pipeline adds
no new Hostinger-side requirement; it reuses the existing deploy
workflow entirely.

## 13. GitHub configuration required

Create **one** of:
- A fine-grained PAT scoped to only this repository, with only
  **Contents: Read and write**.
- A GitHub App installed on only this repository with the same single
  permission, using its installation token.

Then set the four `GITHUB_*` env vars above. Neither credential can be
created by this session — see `docs/CONTENT_PUBLISHING.md` for the
exact steps.

## 14. Google Cloud configuration required

- **Search Console, Analytics**: enable the respective APIs in your
  existing Google Cloud project (standard enablement, no approval
  process) and confirm the OAuth consent screen covers the scopes
  already requested (`webmasters.readonly`, `analytics.readonly`).
- **Business Profile**: as your own note said, this one needs you to
  complete Google's own Cloud Console configuration/approval for the
  Business Profile APIs — there's no sandbox, and this session has no
  path to do that on your behalf.

## 15. Remaining limitations

- **Live-untested**: every new GitHub/Google API call path is verified
  by unit/integration tests with the external client mocked, never
  against the real GitHub or Google APIs — no credentials exist in this
  environment to do that.
- **Production smoke test not run**: `scripts/production-smoke-test.mjs`
  is written and verified against local fixture servers, but this
  session's own network policy blocks outbound requests to
  `shahidiqbal.com` (confirmed via the agent proxy's logged
  `connect_rejected`/403 failures) — it needs to run from an environment
  with real network access.
- **SEO override rollback** isn't built — only blog post rollback. The
  data (`previousCommitSha`) is already recorded for SEO publishes, so
  this is a smaller follow-up, not a redesign.
- **Cover images** aren't wired into blog publishing — the renderer and
  schema support them, but committing the binary file safely wasn't
  shipped half-tested; no existing post uses one yet.
- **Preview system** (Phase 18G — Google/OpenGraph/Twitter/article
  previews before publishing) was not built this phase, per your own
  priority note to focus on the publish pipeline and the Google
  integrations actually working before adding more admin surface.
- **Business Profile** is blocked on your Google Cloud approval, as
  discussed; the code is ready for the moment that's done.
- **No automated database backups** exist for `apps/admin`'s database —
  shown honestly as "Needs configuration" on the new dashboard rather
  than a fabricated green status.

## 16. Exact next actions for Shahid

1. Create a fine-grained GitHub PAT (or GitHub App) scoped to this one
   repo, Contents: Read/write only. Set the four `GITHUB_*` env vars on
   the admin app's host.
2. Set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`/
   `TOKEN_ENCRYPTION_KEY` if not already done, and confirm the Search
   Console and Analytics APIs are enabled in Google Cloud Console.
3. Once both of the above are set: connect each Google integration from
   `/dashboard/google`, pick a real property/site for Search Console
   and Analytics, and try publishing one real blog post to confirm the
   live pipeline end-to-end (watch its status on the post's edit page;
   check the real commit on GitHub and the real deploy on
   shahidiqbal.com).
4. Run `node scripts/production-smoke-test.mjs` from a machine with
   normal internet access against `https://shahidiqbal.com` to get the
   live verification this session's network policy couldn't produce.
5. When ready, separately pursue the Google Cloud Console configuration/
   approval Business Profile's write/performance features need — no
   action is required from this codebase side until that's done.
6. Decide if/when the preview system, SEO-override rollback, and
   cover-image publishing are worth building next, or whether real
   usage of what's live now should come first.
