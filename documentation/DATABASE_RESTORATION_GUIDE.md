# Database Restoration Guide

Full depth: manual §3 (Database Documentation), §7.4 (Restoring the database), §13 (Backup Restoration Checklist).

## What you're restoring

Two separate MySQL databases, never a shared schema:

| Database | Owns | Table count |
|---|---|---|
| Admin / business-CMS | Admin users, site content, leads/CRM, pricing, Google integrations, SEO | 48 |
| Learn (LMS) | Students, courses, commerce, enrollment, community, support | 52 |

A third connection (not a third database) lets the admin app read/write the Learn database directly — same data, a separately-maintained schema copy. Full table-by-table inventory: manual §3.3.

**Uploaded files are inside the `media` table** (a `LONGBLOB` column), not on a filesystem — restoring the database restores every uploaded file with it. See `FILE_STORAGE_RESTORATION_GUIDE.md`, which is a short pointer back to this document for exactly this reason.

## Where the backup is

- **Schema** (structure, no data): `database/schema/` in this branch — a snapshot of the real Drizzle schema and migration files.
- **Content** (actual data, including uploaded media bytes): `database/encrypted-backups/`, encrypted with age or GPG per `SECURITY_AND_ENCRYPTION_GUIDE.md`. **As of this writing, this archive is pending** — see `BACKUP_VERIFICATION_REPORT.md` for current status; nothing below in step 3 can run until it exists.

## Restoration steps

1. **Stand up a MySQL instance** — local, Docker, or a new hosting account. Create two databases matching the admin and learn schemas above.

2. **Run migrations** (Drizzle Kit, one config per database — `admin-core/drizzle.config.ts`, `learn-core/drizzle.config.ts`). Migrations are **not automatic** — there is no migration-on-startup code:
   ```bash
   cd apps/gateway
   pnpm db:admin:migrate      # requires DATABASE_ADMIN_URL
   pnpm db:learn:migrate
   ```
   This recreates the schema (10 admin migrations, 7 learn) but not the data.

3. **Decrypt and import the content backup** once `database/encrypted-backups/` exists (see `SECURITY_AND_ENCRYPTION_GUIDE.md` for the exact decrypt command — the passphrase is never stored in this repository), then import the decrypted SQL into the two databases created in step 1.

4. **Re-apply database-level privilege grants** — a raw SQL import does **not** recreate these:
   ```bash
   pnpm db:admin:apply-grants
   pnpm db:learn:apply-grants
   ```
   This matters specifically because the app's runtime database user deliberately has no DDL privileges, and `audit_logs` is granted `SELECT, INSERT` only at the database level — the audit trail genuinely cannot be altered even by a compromised app process, but only if this step is re-run.

5. **Point the app at the restored instance** — set `ADMIN_DATABASE_URL`, `LEARN_DATABASE_URL`, and `DATABASE_ADMIN_URL` to the new connection details (`ENVIRONMENT_VARIABLES_REFERENCE.md`).

## Verifying the restoration worked

- `pnpm typecheck && pnpm build` in `apps/gateway` completes with no new errors.
- The app starts and `/admin`, `/learn` both respond.
- Logging in as a restored admin account succeeds, and the dashboard shows real restored data — a known lead, a known blog post, a known pricing plan.
- Table counts roughly match §3.3 of the manual (48 + 52 across two databases — exact row counts will differ over time, the *structure* should not).

## Troubleshooting a connection error

- **Locally**, `ECONNREFUSED 127.0.0.1:3306` means there's no reachable MySQL at the URL you configured — this is expected on a totally fresh clone, not a bug.
- **In production**, both connection files already log pool errors (`[db] MySQL pool error...`) rather than crashing. A page that errors once and works on reload is consistent with a pool-exhaustion pattern — the fix is tuning `connectionLimit` (currently 8 on both pools), not assuming schema corruption. See manual §3.5.
