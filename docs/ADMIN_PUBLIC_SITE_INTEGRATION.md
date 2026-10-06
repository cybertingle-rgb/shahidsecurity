# Admin → Public Site Integration

## Audit: how the public site gets content today

Read directly before deciding anything, not assumed:

- **Content** (`blog`, `services`, `caseStudies`, `legal`) is Astro content
  collections — real `.mdx` files under `src/content/*/`, loaded at
  **build time** by `astro/loaders`' `glob()` loader
  (`src/content.config.ts`). There is no database and no runtime fetch
  anywhere in this site.
- **SEO** (`src/lib/seo.ts`, `BaseLayout.astro`) computes `<title>`,
  `<meta name="description">`, canonical, OG/Twitter tags, and JSON-LD
  per page at build time from each page's own props — a static site has
  no mechanism to vary these per-request.
- **Sitemap** (`astro.config.mjs`'s `sitemap()` integration) is
  generated at build time by walking the built page list; `lastmod` is
  read from each content file's own frontmatter
  (`collectLastmods()` in `astro.config.mjs`).
- **robots.txt** is a static file in `public/`.
- **Images** are either static files in `public/` or Astro's
  `image()` schema helper for content-collection cover images,
  optimized at build time.
- **Deploy** (`.github/workflows/deploy.yml`): on push to this branch,
  GitHub Actions runs `pnpm build` (which is `astro check && astro
  build` — typecheck and build in one step), then rsyncs `dist/` over
  SSH to Hostinger **only if the build step succeeded** — a GitHub
  Actions job's later steps never run after an earlier step fails, so
  "a failed build cannot destroy production" is already true today,
  structurally, for every push. No separate test suite exists for this
  repo (it's content/markup/PHP, verified historically by scripted
  crawl-audits and manual checks, not a vitest suite).

## Decision: git-commit export, not a runtime database dependency

The site is `output: 'static'` specifically so it can run on Hostinger
shared hosting with zero server/database cost or attack surface. Making
it fetch from a database at build time would add a hard runtime
dependency (the build breaks if the database is unreachable) to a site
that currently has none, and — more importantly — bypasses the
deploy pipeline's existing, already-proven safety property (build
failure blocks deploy) unless carefully re-implemented. It also
duplicates a system (content collections + Zod schema validation) that
already works and is already the site's single source of truth for
every page not migrated to the CMS.

Instead: **publishing from the admin writes a real `.mdx` (or small
JSON data) file via a git commit to this exact repo, on this exact
branch** — the same push the existing `deploy.yml` already watches and
already builds safely. This means:

- Zero new runtime dependency on the static site.
- Zero duplicated build/deploy logic — the proven pipeline is reused
  exactly as-is.
- A real, permanent, revertible history — every publish is a real git
  commit with a real SHA, and rollback is reverting to a prior commit,
  not a bespoke versioning system.
- The content remains, as today, plain `.mdx` files any future
  contributor (human or Claude) can read without this admin existing.

### What's migrated to the CMS vs. what stays code-controlled

Per the brief: migrate explicitly, don't make everything database-driven,
and never create two competing sources of truth for one field.

| Content | Source of truth after this phase |
|---|---|
| Blog posts | **apps/admin** (`blog_posts` + tags/FAQs) → exported as `.mdx` on publish |
| Per-page SEO overrides | **apps/admin** (`seo_pages`) → exported as a single generated data file (`src/data/seo-overrides.generated.json`), read by `BaseLayout.astro` at build time and merged over each page's own defaults — the override wins only when a row for that exact path exists |
| Services, case studies, legal pages, navigation, static page copy | **Still code-controlled** (`.mdx`/`.astro` files, edited directly in this repo) — not migrated in this phase. The admin's existing Services CRUD (Phase 3) remains a staging/record-keeping tool for that content until a future phase explicitly migrates it the same way blog posts were. |

This keeps exactly one source of truth per migrated field: once a blog
post or an SEO override is published from the admin, editing the
generated file directly in the repo would be overwritten by the next
publish — the admin UI is where it's edited from that point on.

## Credential handling (Section 18C)

The admin server needs `contents:write` on this one repository to
create/update files and commits — nothing broader (no admin, no other
repos, no org-level access). Two supported options, both server-side
only, **never sent to the browser**:

1. **Fine-grained personal access token**, scoped to exactly this
   repository, with only the "Contents" permission set to
   Read and write. Simplest to set up.
2. **A GitHub App** installed on just this repository, with the same
   "Contents: Read and write" permission, using its installation
   token (short-lived, auto-refreshed) rather than a long-lived PAT —
   the more defensible option long-term, since the token it uses
   expires in an hour and is scoped to the one installation.

Either way: set as `GITHUB_TOKEN` (PAT) or
`GITHUB_APP_ID`/`GITHUB_APP_PRIVATE_KEY`/`GITHUB_APP_INSTALLATION_ID`
(App) in `apps/admin`'s server-side environment only. See
`docs/CONTENT_PUBLISHING.md` for the exact setup steps and the precise
permission to grant.

**This session cannot create either credential** — that requires
Shahid's own GitHub account action (creating a fine-grained PAT or
installing a GitHub App), the same category of external dependency as
the Google OAuth client credentials in Phase 9. The code is built and
tested assuming one of them exists; the live git-push-triggers-a-real-
deploy path has not been exercised against the real production branch
in this session (see `docs/CONTENT_PUBLISHING.md`'s own testing notes
for exactly what was and wasn't verified, and why a real test publish
to the live site was not performed without that explicit go-ahead).
