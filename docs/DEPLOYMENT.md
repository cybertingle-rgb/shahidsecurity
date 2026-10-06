# Deployment

`apps/admin` deploys the same proven way `apps/learn` already does on
this Hostinger account: `output: 'standalone'`, a dedicated Node.js App
in hPanel, its own subdomain, and `.github/workflows/deploy-admin.yml`
(mirrors `deploy-lms.yml`'s steps exactly, with one addition — see
below).

## One-time hPanel setup required (not done by this session)

1. Create a new subdomain, e.g. `admin.shahidiqbal.com`.
2. Under hPanel's **Setup Node.js App**, point a new app at that
   subdomain's directory (a sibling of the marketing site's
   `public_html` and the LMS's directory, never inside either).
3. Create a MySQL database and a full-privilege user for it (this
   becomes `ADMIN_DATABASE_ADMIN_URL`).
4. Add all the GitHub Actions secrets listed in
   `.github/workflows/deploy-admin.yml`'s own comment.
5. Set up a Cron Job (hPanel → Cron Jobs) calling
   `/api/internal/publish-scheduled` every ~15 minutes — see
   `docs/BLOG_CMS.md`.

## The one real difference from the LMS workflow: excluding `data/`

The media library (`docs/AI_ASSISTANT_WORKFLOW.md` / the media section
of `docs/ADMIN_ARCHITECTURE.md`) stores uploaded files on local disk at
`data/media-uploads`, created at runtime — never part of the build
output. The deploy workflow's rsync step uses `--exclude=data` (not
`--delete-excluded`) specifically so every deploy's `--delete` sync
doesn't erase previously uploaded files on the remote host. This was
caught by reasoning through what `rsync --delete` actually does to a
runtime-created directory that's absent from the build source, not
discovered after the fact.

## First deploy checklist

1. Confirm all secrets are set.
2. Push to `claude/wizardly-keller-yg0bj7` with changes under
   `apps/admin/**` (or run the workflow manually).
3. After the first successful deploy, run the super-admin seed once
   against production (either via a one-off SSH command or by
   temporarily adding a secret-gated seed endpoint — not built, since
   this is a one-time, operator-run step): `ADMIN_SEED_EMAIL=... ADMIN_SEED_PASSWORD=... pnpm db:seed-super-admin`.
4. Remove or rotate `MIGRATE_SECRET` usage once initial setup is
   confirmed working, per the same reasoning as apps/learn's identical
   endpoint (a permanent HTTP migration endpoint is a standing surface
   even when secret-gated).

## Not yet done (requires the user's own action)

This session has not performed any of the hPanel setup, DNS, or secret
creation above — it requires access to the user's own Hostinger account
and GitHub repository secrets, which this session does not have.
