# Disaster Recovery Manual

The top-level "what do I actually do" entry point for recovering the Shahid Security platform from this backup, start to finish. Each step links to the document that covers it in depth — this manual is the sequence, not the detail.

Full depth for everything below: manual §7 (Backup, Recovery and Restoration Manual) and §13 (Backup Restoration Checklist) in `docs/Shahid-Security-Complete-Technical-Manual.md`.

## Before you start

Confirm what you're recovering from: total loss of the production host, a corrupted database, or just "I need a working copy of this system somewhere new." All three follow the same steps below — the difference is just how much of steps 1–4 you actually need to do versus already have.

## Step 1 — Get the source code running

Nothing below works without this. Follow `LOCAL_SETUP_GUIDE.md` completely: clone the repository, check out the production branch (or this backup branch, if you also need the documentation/schema), `pnpm install`, and confirm `pnpm build` succeeds in both the root and `apps/gateway` *before* touching a database — a build failure at this stage is a code/environment problem, not a data problem, and is much easier to diagnose in isolation.

## Step 2 — Stand up and restore the database

Follow `DATABASE_RESTORATION_GUIDE.md`: create two fresh MySQL databases, run migrations, decrypt and import the content backup (see `SECURITY_AND_ENCRYPTION_GUIDE.md` for the passphrase-based decrypt step — the passphrase itself is never in this repository), then re-apply the database-level privilege grants. Do not skip the grants step; it's what makes the audit trail (`audit_logs`) genuinely tamper-resistant, and a raw SQL import does not recreate it.

**There is no separate file-storage restoration step.** Uploaded files are inside the database you just restored — see `FILE_STORAGE_RESTORATION_GUIDE.md` if you want the one-paragraph explanation of why, but there is nothing additional to do.

## Step 3 — Configure the environment

Follow `ENVIRONMENT_VARIABLES_REFERENCE.md`: set every required variable to a **real** value obtained from its original source (Google Cloud Console, Cloudflare dashboard, a freshly generated secret, your new database's connection string, etc.) directly in the new environment's own variable store. No real value for any of these exists anywhere in this repository, this manual, or this backup — that absence is intentional, not a missing step you failed to find.

## Step 4 — Verify before declaring success

- `pnpm build` succeeds at the repo root and in `apps/gateway`, with no new errors.
- The app starts and `/`, `/admin`, `/learn` all respond.
- Logging in as a restored admin account works and shows real restored data — a known lead, blog post, or pricing plan, not an empty dashboard.
- Table counts roughly match the manual's §3.3 (48 admin tables + 52 learn tables — exact row counts will differ over time, but the structure should not).
- Document anything that did not restore cleanly. A partially-successful restoration that's reported as fully successful is worse than an honest list of what's still broken.

## Step 5 — Re-establish live deployment (only once steps 1–4 are solid)

Follow `PRODUCTION_DEPLOYMENT_GUIDE.md` to point a new GitHub Actions secret set at the new host (Astro site) and configure a new Hostinger-or-equivalent Node.js App's Git auto-deployment for `apps/gateway`. **Actively verify** the auto-deploy branch setting rather than assuming the dashboard saved what you expect — this exact setting has silently drifted before on this project and silently stopped production from updating.

## If you only need one checklist to tick off

Use `docs/Shahid-Security-Complete-Technical-Manual.md` §13 directly — it's the same sequence above as a literal checklist, written for someone running the restoration in real time.
