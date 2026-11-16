# Backup Project Inventory

**Date:** 2026-11-16. **Branch:** `backup/disaster-recovery-2026-11-16` (created from `claude/wizardly-keller-yg0bj7`, the live production branch — see `README.md` in this branch for why a separate branch, not a repo restructure). All counts below are measured directly against the repository at this branch's base commit, not estimated.

| Component | Location | File Count | Size | Technology | Key Dependencies | Backup Status | Restoration Requirements |
|---|---|---|---|---|---|---|---|
| Main public website | `src/` (root) | 182 files | 1.8 MB | Astro 7.3, Tailwind v4, MDX | `astro`, `@astrojs/mdx`, `@astrojs/sitemap`, `astro-icon` | **Backed up** — tracked in Git, this branch | `pnpm install` + `pnpm build` at repo root; needs the admin API reachable at build time for `/pricing/` and `/learn/pricing/` to render real data (falls back gracefully if not) |
| Blog content | `src/content/blog/` | 87 posts | (included in `src/` above) | MDX content collection | — | **Backed up** | None beyond the site build |
| Service pages content | `src/content/services/` | 10 files | (included above) | MDX content collection | — | **Backed up** | None |
| Case studies content | `src/content/caseStudies/` | 1 file | (included above) | MDX content collection | — | **Backed up** | None — genuinely only one exists; more require real client permission, not a technical gap |
| Industry landing pages | `src/pages/industries/` | 1 index + 7 subpages | (included above) | Astro pages | — | **Backed up** | None |
| GCC/Pakistan location pages | `src/pages/locations/` | 1 hub + 5 pages | (included above) | Astro pages | — | **Backed up** | None |
| Admin application | `apps/gateway/src/admin-core/` + `apps/gateway/src/app/admin/` | 156 files (admin-core) + routes under `app/admin/` | part of 5.2 MB gateway total | Next.js 16.4 (App Router), React 19.3 | `next`, `react`, `drizzle-orm` 0.45, `next-auth`-equivalent custom session auth | **Backed up** — source only | Needs a reachable MySQL database (see Database row) and the env vars in `documentation/ENVIRONMENT_VARIABLES_REFERENCE.md` |
| Student portal (Learn with Shahid) | `apps/gateway/src/learn-core/` + `apps/gateway/src/app/learn/` | 103 files (learn-core) + routes under `app/learn/` | part of 5.2 MB gateway total | Next.js 16.4, same monorepo as admin | same as admin | **Backed up** — source only | Same as admin |
| Database schema & migrations | `apps/gateway/src/admin-core/db/` + `apps/gateway/src/learn-core/db/` | see `database/schema/` snapshot, this branch | — | Drizzle ORM, MySQL | `drizzle-orm`, `drizzle-kit` (dev only) | **Backed up (schema only)** | **Actual table data is NOT yet backed up** — see `SECURITY_AND_ENCRYPTION_GUIDE.md` and the final report; pending a real database export |
| Uploaded media | Database `media` table (see note) | N/A — not a filesystem location | — | MySQL `longblob` column | — | **Not yet backed up** (same blocker as database data — uploaded files are stored as blob columns in the database, not on disk, by deliberate design; see `apps/gateway/src/admin-core/lib/media.ts`) | Resolved once the database data backup is resolved — there is no separate "uploads folder" to back up in this architecture |
| Build/deploy scripts | `scripts/` (root) + `apps/gateway/scripts/` | 5 + 3 = 8 files | small | Node.js (`.mjs`) | — | **Backed up** | None |
| GitHub Actions workflows | `.github/workflows/` | 4 files + Dependabot config | small | YAML | — | **Backed up** | Only `deploy.yml` (Astro site) is live/automatic; `deploy-admin.yml`/`deploy-lms.yml` are legacy pre-consolidation and no longer apply; `deploy-gateway.yml` is deliberately inert (smoke-test only) — the gateway's real deploy is Hostinger's own Git-integration pipeline, configured in hPanel, not a workflow file |
| Project documentation | `docs/` (root) | 103 files | 1.2 MB | Markdown | — | **Backed up** | None |
| Static assets (logos, OG images, flags, icons) | `public/` (root) | 168 files | 12 MB | PNG/WebP/SVG | — | **Backed up** | None |
| Dependency manifests & lockfiles | root + `apps/gateway/` | `package.json` ×2, `pnpm-lock.yaml`, `pnpm-workspace.yaml` | small | pnpm workspaces | 14 root deps + 21 gateway deps (production) | **Backed up** | `pnpm install` reproduces the exact tree from the lockfile |
| Full repository (Git-tracked) | entire repo | 987 files | — | Git | — | **Backed up** | — |

## Notes on scope decisions

- **No `.env` files exist in this repository and none are backed up as plaintext** — confirmed via `.gitignore` (excludes `.env`, `.env.local`) and a direct search; this is correct and must stay this way. Real values live only in Hostinger's Node.js environment-variable store (masked on read, per Hostinger's own API) and are documented by *name only* in `documentation/ENVIRONMENT_VARIABLES_REFERENCE.md`.
- **No separate "uploaded files" storage exists to inventory.** This repeats across this document because it's a real architectural fact that changes what "Section 6: Uploaded Files and Media Backup" means for this specific project — see `apps/gateway/src/admin-core/lib/media.ts`'s own code comment, which explains that local-disk storage was tried and abandoned after a real incident (Hostinger's deploy process wipes the app directory on every deploy, which once deleted a course thumbnail).
- **Database table *contents*** (as opposed to schema) are the one genuinely open item in this inventory — tracked as its own task in the final report, not silently marked "backed up."
- Build artifacts (`dist/`, `.next/`, `node_modules/`) are correctly excluded from this inventory and from Git — they're fully reproducible from source via `pnpm install && pnpm build`, which is the point of a source backup.
