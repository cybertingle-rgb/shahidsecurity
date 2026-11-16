# Shahid Security — Disaster-Recovery Documentation Suite

This `documentation/` directory is part of the `backup/disaster-recovery-2026-11-16` branch, a dedicated backup of the Shahid Security platform (`shahidiqbal.com`). It exists so that the project can be understood and restored by someone who was not involved in building it, without touching the live production branch or its deploy pipelines.

**Start here, then go deep in [`docs/Shahid-Security-Complete-Technical-Manual.md`](../docs/Shahid-Security-Complete-Technical-Manual.md) (and its PDF twin, `docs/Shahid-Security-Complete-Technical-Manual.pdf`)** — the manual is the single source of truth for how the system actually works, verified against the real code, not written from a generic template. Every document in this folder is a short, task-oriented entry point that tells you which section of the manual to read for the full story, rather than repeating it.

## What's in this branch

| Item | Where |
|---|---|
| Full source code | Same tree as the production branch — source already lives in Git, so no separate copy was needed |
| Project inventory (what's backed up, what isn't, file/size counts) | [`BACKUP_PROJECT_INVENTORY.md`](../BACKUP_PROJECT_INVENTORY.md) at the repo root |
| The complete technical manual (Markdown + PDF) | `docs/Shahid-Security-Complete-Technical-Manual.{md,pdf}` |
| Diagram sources (SVG) for the manual's Visual Documentation section | `docs/diagrams/` |
| This documentation suite | `documentation/` (this directory) |
| Database **schema** snapshot (structure, not data) | `database/schema/` |
| Database **content** backup, encrypted | `database/encrypted-backups/` — **pending**, see `BACKUP_VERIFICATION_REPORT.md` |
| Encryption instructions | [`SECURITY_AND_ENCRYPTION_GUIDE.md`](SECURITY_AND_ENCRYPTION_GUIDE.md) |

## Reading order for a restoration

1. [`DISASTER_RECOVERY_MANUAL.md`](DISASTER_RECOVERY_MANUAL.md) — the top-level "what do I do" entry point, start to finish.
2. [`LOCAL_SETUP_GUIDE.md`](LOCAL_SETUP_GUIDE.md) — get the code running anywhere first.
3. [`DATABASE_RESTORATION_GUIDE.md`](DATABASE_RESTORATION_GUIDE.md) and [`FILE_STORAGE_RESTORATION_GUIDE.md`](FILE_STORAGE_RESTORATION_GUIDE.md) — restore real data.
4. [`ENVIRONMENT_VARIABLES_REFERENCE.md`](ENVIRONMENT_VARIABLES_REFERENCE.md) — every variable name the restored system needs, and where to go get a real value for each.
5. [`PRODUCTION_DEPLOYMENT_GUIDE.md`](PRODUCTION_DEPLOYMENT_GUIDE.md) — re-establish the two live deploy pipelines once the system works locally.

## Reading order to understand or operate the platform day-to-day

- [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md) — the shape of the whole system in five minutes.
- [`ADMIN_AND_STUDENT_PLATFORM_GUIDE.md`](ADMIN_AND_STUDENT_PLATFORM_GUIDE.md) — what the admin dashboard and the student ("Learn") platform actually do.
- [`THIRD_PARTY_INTEGRATIONS.md`](THIRD_PARTY_INTEGRATIONS.md) — every external service this platform talks to, and how to tell if one is actually working.

## A rule that applies to every document in this suite

No document in this backup — including this one — ever contains a real secret, password, API key, or connection string. Every reference to credentials is a variable **name** plus where to obtain a real value; actual values live only in the production host's own environment-variable store. See [`SECURITY_AND_ENCRYPTION_GUIDE.md`](SECURITY_AND_ENCRYPTION_GUIDE.md) for why, and for how the database content backup is encrypted for the same reason.
