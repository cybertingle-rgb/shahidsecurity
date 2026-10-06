import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Sets up the app's runtime MySQL privileges — makes audit_logs
 * insert-only at the database level, same reasoning and same two-user
 * split (DATABASE_ADMIN_URL vs. DATABASE_URL) as
 * apps/learn/src/db/apply-grants.ts. See that file's comment for the
 * full explanation of why MySQL's additive privilege model requires
 * granting table-by-table rather than revoking from a broad grant.
 *
 * Idempotent — safe to run after every migration. Run as:
 *   pnpm db:apply-grants
 */
async function main() {
  const adminConnectionString = process.env.DATABASE_ADMIN_URL;
  const appConnectionString = process.env.DATABASE_URL;
  if (!adminConnectionString) throw new Error('DATABASE_ADMIN_URL is required (a full-privilege user)');
  if (!appConnectionString) throw new Error('DATABASE_URL is required (the narrower runtime user to provision grants for)');

  const appUrl = new URL(appConnectionString);
  const appUser = decodeURIComponent(appUrl.username);
  const appPassword = decodeURIComponent(appUrl.password);
  const database = appUrl.pathname.replace(/^\//, '');
  const appHost = process.env.DATABASE_APP_HOST ?? '%';
  if (!appUser || !appPassword || !database) {
    throw new Error(`Could not parse app user/password/database from DATABASE_URL (got user=${appUser} db=${database})`);
  }

  const connection = await mysql.createConnection({ uri: adminConnectionString, multipleStatements: true });

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
  console.log('Done. This user has no DDL privileges anywhere — migrations must run as DATABASE_ADMIN_URL.');

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
