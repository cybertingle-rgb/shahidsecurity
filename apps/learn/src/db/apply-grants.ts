import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Sets up the app's runtime MySQL privileges — and specifically, makes
 * audit_logs insert-only at the database level, so no application code
 * path (buggy or malicious) can silently rewrite or erase the audit
 * trail. See docs/lms-database.md and docs/lms-security.md.
 *
 * MySQL's privilege model is purely additive/union-based across scopes —
 * unlike Postgres, there is no way to REVOKE a privilege from one table
 * if it was granted at the database level (`GRANT ALL ON db.*` already
 * includes UPDATE/DELETE/DROP on every table, including audit_logs, and
 * no later table-level REVOKE can subtract from that). The only correct
 * way to make one table narrower is to never grant broadly in the first
 * place: every table gets its privileges granted individually, and
 * audit_logs simply never receives UPDATE, DELETE, or DROP. (MySQL
 * implements TRUNCATE as an implicit DROP+CREATE, so withholding DROP
 * blocks TRUNCATE too, with no separate TRUNCATE privilege needed.)
 *
 * This is why two MySQL users are required, not one:
 *  - DATABASE_ADMIN_URL: a full-privilege user (e.g. the one Hostinger's
 *    hPanel creates by default) — runs migrations and this script.
 *  - DATABASE_URL: a second, narrower user this script provisions the
 *    grants for — the one the deployed app (and only the app) actually
 *    connects as at runtime.
 *
 * Idempotent — safe to run after every migration, in every environment
 * (dev/staging/production), per docs/lms-deployment.md's pre-deployment
 * checklist. Run as: pnpm db:apply-grants
 */
async function main() {
  const adminConnectionString = process.env.DATABASE_ADMIN_URL;
  const appConnectionString = process.env.DATABASE_URL;
  if (!adminConnectionString) throw new Error('DATABASE_ADMIN_URL is required (a full-privilege user — see the comment in this file)');
  if (!appConnectionString) throw new Error('DATABASE_URL is required (the narrower runtime user to provision grants for)');

  const appUrl = new URL(appConnectionString);
  const appUser = decodeURIComponent(appUrl.username);
  const appPassword = decodeURIComponent(appUrl.password);
  const database = appUrl.pathname.replace(/^\//, '');
  // MySQL grants are scoped per source host, not just per username. '%'
  // (any host) is the common case for a hosting-provider-issued database
  // user; override with DATABASE_APP_HOST if your setup grants a specific
  // host instead.
  const appHost = process.env.DATABASE_APP_HOST ?? '%';
  if (!appUser || !appPassword || !database) {
    throw new Error(`Could not parse app user/password/database from DATABASE_URL (got user=${appUser} db=${database})`);
  }

  const connection = await mysql.createConnection({ uri: adminConnectionString, multipleStatements: true });

  // Since MySQL 5.7.6/8.0, GRANT no longer implicitly creates users — the
  // narrower runtime user has to be created explicitly before it can be
  // granted anything. Idempotent: does nothing if it already exists (e.g.
  // created by hand in hPanel instead).
  await connection.query(`CREATE USER IF NOT EXISTS '${appUser}'@'${appHost}' IDENTIFIED BY ${connection.escape(appPassword)}`);

  const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ?`,
    [database],
  );
  const tableNames = tableRows.map((r) => String(r.tableName));
  if (tableNames.length === 0) {
    throw new Error(`No tables found in ${database} — run migrations before this script.`);
  }

  console.log(`Granting SELECT/INSERT/UPDATE/DELETE on ${tableNames.length - 1} tables, and SELECT/INSERT-only on audit_logs, to '${appUser}'@'${appHost}'...`);
  for (const table of tableNames) {
    const privileges = table === 'audit_logs' ? 'SELECT, INSERT' : 'SELECT, INSERT, UPDATE, DELETE';
    await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${table}\` TO '${appUser}'@'${appHost}'`);
  }
  await connection.query('FLUSH PRIVILEGES');
  console.log('Done. This user has no DDL privileges (CREATE/ALTER/DROP/INDEX) anywhere — migrations must run as DATABASE_ADMIN_URL.');

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
