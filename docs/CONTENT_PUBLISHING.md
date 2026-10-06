# Content publishing: Admin → live website

How "Publish to shahidiqbal.com" actually works, what's implemented, and
what Shahid still needs to configure. See
`docs/ADMIN_PUBLIC_SITE_INTEGRATION.md` for the architecture decision
this builds on.

## Status: Implemented, not yet configured

The code path is complete and tested (unit tests for rendering/
validation, integration tests against the real test database with the
GitHub client mocked). It has **not** been exercised against a real
GitHub repository, because no `GITHUB_TOKEN` exists in this environment —
that's a credential only Shahid can create. Until it's set, every
"Publish to shahidiqbal.com" button renders disabled with an explanatory
note; nothing fakes success.

## How it works

1. Admin edits a blog post or SEO override in the CMS (this only ever
   touches this app's own database — the live site is untouched).
2. Admin clicks "Publish to shahidiqbal.com" / "Publish override to
   shahidiqbal.com". This calls a Server Action gated by a dedicated
   permission (`content.publish` or `seo.publish` — see
   docs/ADMIN_SECURITY.md), not the general `blog.manage`/`seo.manage`
   permission editors already have.
3. The content is validated and rendered into the exact file format the
   Astro site's content collections (or its SEO-override merge file)
   already expect — `src/lib/publish/renderBlogPost.ts` and
   `renderSeoOverrides.ts`. Anything that isn't plain Markdown/plain text
   (a `<script>` tag, an MDX expression, HTML in a title) is rejected
   outright before anything is committed.
4. The rendered file is committed directly to the deploy branch via the
   GitHub Contents API (`src/lib/github/contents.ts`) — a real git
   commit, with a real SHA, authored by whatever credential is
   configured. This is the same branch `.github/workflows/deploy.yml`
   already watches, so the existing build-then-deploy pipeline (which
   already blocks a failed build from reaching production) runs exactly
   as it would for a commit made by hand.
5. A row in `publications` tracks the attempt: `publishing` →
   `building` → `published`/`failed`, with the real commit SHA, the
   commit it's replacing, and (once matched) the real GitHub Actions run
   id. "Refresh status" re-polls that real run rather than guessing.
6. Every publish and rollback writes an audit log entry
   (`BLOG_PUBLISHED`, `SEO_PUBLISHED`, `DEPLOYMENT_FAILED`,
   `DEPLOYMENT_SUCCEEDED`, `DEPLOYMENT_ROLLBACK`) — never the token
   itself.

## Rollback

Every publication with a recorded "previous commit" can be rolled back.
Rollback doesn't rewrite git history — it reads the file's content as it
was at that previous commit and commits that content again as a new,
equally real, equally auditable commit. The previous production build
is never touched or at risk; a rollback is just another ordinary publish.

## What Shahid needs to do (this session cannot do it)

Create **one** of these and set the matching env vars on the admin app's
host (never in the browser, never in a client component — these are
read only by server-side code in `src/lib/github/client.ts`):

### Option A — Fine-grained Personal Access Token (simpler)

1. GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token.
2. Repository access: **only** this one repository
   (`cybertingle-rgb/shahidsecurity`).
3. Permissions: **Contents: Read and write**. Nothing else — no Actions,
   no Admin, no Issues/PRs.
4. Set:
   - `GITHUB_TOKEN` = the token
   - `GITHUB_REPO_OWNER` = `cybertingle-rgb`
   - `GITHUB_REPO_NAME` = `shahidsecurity`
   - `GITHUB_REPO_BRANCH` = the branch `deploy.yml` deploys from

### Option B — GitHub App (more setup, no personal token to rotate)

1. Create a GitHub App scoped to this one repository, with the same
   **Contents: Read and write** repository permission only.
2. Install it on the repository.
3. Generate a private key for it.
4. Whatever process mints that App's installation token (short-lived,
   auto-refreshed) sets `GITHUB_TOKEN` to the current installation
   token before each request — `src/lib/github/client.ts` doesn't mint
   this itself; it just reads `GITHUB_TOKEN`. This is the more
   secure option for anyone besides Shahid ever having a token, at the
   cost of needing that refresh process set up once.

Either way: the token/private key is **never** sent to the browser,
never stored in client-visible config, and never logged — only read
server-side from the environment.

## Known limitation: cover images

A blog post's `cover` image field is supported in the renderer and
database but not yet wired into the publish action — no existing blog
post uses one yet, and committing a binary file safely (base64, correct
content-type, verified against a real repo) needs its own pass rather
than shipping half-tested. Text-only publishing (title, description,
body, tags, FAQs, related posts/service) is fully implemented.
