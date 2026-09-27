import 'dotenv/config';
import { Pool } from 'pg';

/**
 * Applies the one DB-level privilege restriction the schema can't express
 * on its own: the application's normal database role gets no UPDATE,
 * DELETE, or TRUNCATE grant on audit_logs, so no application code path —
 * buggy or malicious — can silently rewrite or erase the audit trail.
 * Insert and select remain, since the app needs to write new entries and
 * the admin UI needs to read them. See docs/lms-database.md and
 * docs/lms-security.md.
 *
 * Idempotent — safe to run after every migration, in every environment
 * (dev/staging/production), per docs/lms-deployment.md's pre-deployment
 * checklist. Run as: pnpm db:apply-grants
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString });
  const result = await pool.query<{ current_user: string }>('SELECT current_user');
  const row = result.rows[0];
  if (!row) throw new Error('SELECT current_user returned no rows');
  const currentRole = row.current_user;

  console.log(`Revoking UPDATE, DELETE, TRUNCATE on audit_logs from ${currentRole}...`);
  const quotedRole = `"${currentRole.replace(/"/g, '""')}"`;
  await pool.query(`REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM ${quotedRole}`);
  console.log('Done.');

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
