# System Architecture — Quick Reference

Full depth: manual §1 (Complete Project Architecture) and §10's three diagrams (auth flow, deployment workflow, backup/restoration flow).

## The shape of it

One domain, `shahidiqbal.com`, no subdomains, two halves that deploy through two completely different pipelines:

1. **The marketing site** — a static Astro site (`/`, `/blog/*`, `/services/*`, `/industries/*`, `/locations/*`, `/pricing/`, `/about/`, `/contact/`, `/book/`). Built and deployed by GitHub Actions (`.github/workflows/deploy.yml`) on every push — the only automatic, push-triggered deploy in the repo.
2. **`apps/gateway`** — one Next.js 16 / React 19 application serving both `/admin/*` and `/learn/*` from the same process. "admin-core" and "learn-core" are directory/namespace conventions inside this one app, a holdover from when they were two separate apps before a platform-consolidation merge — there is no separate admin server or learn server. Deployed through **Hostinger's own Git-integration Node.js App pipeline**, not a GitHub Actions workflow.

> The single most important operational fact about this architecture: a push to the production branch does **not** automatically redeploy `/admin`/`/learn` unless Hostinger's stored Git-auto-deployment branch setting for that Node.js App actually matches that branch. This has caused real incidents (see manual §1.6, §8) — always confirm the actual deployed commit via Hostinger's deployment status, don't assume a push reached production.

## Two databases, never a shared schema

- **Admin / business-CMS** — admin users, site content, leads/CRM, pricing, Google integrations, SEO. 48 tables.
- **Learn (LMS)** — students, courses, commerce, enrollment, community, support. 52 tables.

A third connection (not a third database) lets the admin dashboard read/write the Learn database directly, with a manually-kept-in-sync copy of its schema. Full table inventory: manual §3.3.

## Two independent session systems

Admin and Learn each have their own cookie, their own session table, no SSO between them, both database-validated (not JWT) — a leaked cookie is required, a leaked database row alone is not enough (the stored value is a one-way hash). Full detail: manual §1.4.

## Uploaded files live in the database, not on disk

Deliberately — Hostinger's deploy process replaces the entire app directory on every deploy, which once deleted real uploaded files when they lived on disk. File bytes are now a `LONGBLOB` column in the `media` table. This means database backup and media backup are the same task — see `FILE_STORAGE_RESTORATION_GUIDE.md`.

## Where to look for more

| Question | Manual section |
|---|---|
| What does each directory/file actually do? | §2 — Complete Source Code Directory Guide |
| How do I find the code behind a specific page? | §5 — Code Access and Modification Manual |
| What API routes exist and what do they do? | §6 — API and Integration Documentation |
| What's the known technical debt / unresolved risk? | §8 (Troubleshooting), §9 (Security) |
