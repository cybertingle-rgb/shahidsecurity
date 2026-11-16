# Production Deployment Guide

Full depth: manual §1.6 (Hosting and deployment architecture), §7.8 (Recovering on a new machine or hosting environment), §10's deployment-workflow diagram.

## There are two separate pipelines — know which one you're touching

| What | Trigger | Mechanism |
|---|---|---|
| Astro marketing site (`/`, `/blog/*`, `/services/*`, etc.) | Push to the production branch | `.github/workflows/deploy.yml` — GitHub Actions: `pnpm install` → `pnpm build` → SSH/rsync to Hostinger → permissions fix |
| `apps/gateway` (`/admin/*` + `/learn/*`) | Push to whichever branch Hostinger's Node.js App has configured | **Hostinger's own Git-integration pipeline** — configured in hPanel (or its API), not a GitHub Actions workflow. Settings: `node_version: 22`, `app_type: next`, `root_directory: apps/gateway`, `output_directory: .next`, `build_script: build` |

A third file, `.github/workflows/deploy-gateway.yml`, is deliberately inert — `workflow_dispatch` only, no `push` trigger, no build/deploy steps. It only runs a post-deploy smoke test after the fact; it does not perform a deploy.

## The one fact that has caused real incidents on this project

**A push to the production branch does not automatically redeploy the gateway unless Hostinger's stored auto-deploy branch setting actually matches that branch.** If it drifts to an old or abandoned branch, every subsequent push silently stops reaching `/admin`/`/learn` while the Astro site keeps deploying normally — the repository looks correct, but production doesn't change.

**Always verify, don't assume**, after any push you expect to reach the gateway:
1. Check the actual deployed commit via Hostinger's deployment status for that Node.js App.
2. Compare it to the production branch's current HEAD.
3. If they don't match, correct the stored Git auto-deployment branch setting (this also fixes all future pushes), then trigger a fresh build — don't wait for the next push to "fix itself."

## Setting up deployment on a new host (disaster recovery)

Follow this *after* the system already builds and runs locally (`LOCAL_SETUP_GUIDE.md`) and the database is restored (`DATABASE_RESTORATION_GUIDE.md`):

1. **Astro site**: add the required GitHub Actions secrets for the new host — `DEPLOY_SSH_KEY_B64`, `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_PATH` (manual §2). Test via a manual `workflow_dispatch` run before relying on push-triggering.
2. **Gateway**: configure a new Hostinger (or equivalent) Node.js App, connect its Git integration to this repository, point it at the correct production branch, and set the build settings above. Set every required environment variable (`ENVIRONMENT_VARIABLES_REFERENCE.md`) in that host's own variable store — never in a committed file.
3. **Actively verify** the auto-deploy branch setting immediately after configuring it, and again after the first real push — given this project's own history of that setting silently drifting, do not assume the UI saved what you expect.

## Before pushing a change that will reach production

```bash
pnpm astro check                                    # root
cd apps/gateway && pnpm typecheck && pnpm lint
pnpm build                                          # root
cd apps/gateway && pnpm build                       # gateway — rebuilds Astro internally, confirms the full chain
```

A "gateway build failure" is often an Astro-side error surfacing partway through, since the gateway's build script runs the Astro build internally (manual §2, §8).
