import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../src/db/schema';

const pool = mysql.createPool({ uri: process.env.DATABASE_URL, timezone: 'Z' });
export const testDb = drizzle(pool, { schema, mode: 'default' });

// A separate, privileged connection used ONLY for test cleanup — the
// app's own runtime role (same restricted grants production would use)
// deliberately has no DROP grant on audit_logs (src/db/apply-grants.ts),
// which is exactly what security.test.ts verifies. Local test only;
// never wired to a staging or production connection string.
const adminPool = mysql.createPool({ uri: process.env.TEST_DB_ADMIN_URL ?? 'mysql://root@127.0.0.1:3306/shahid_security_admin_test', timezone: 'Z' });

/** Wipes all application tables (including audit_logs) between tests — this is the isolated test database, never dev or production. */
export async function truncateAll() {
  const [rows] = await adminPool.query<mysql.RowDataPacket[]>(
    `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name != '__drizzle_migrations'`,
  );
  if (rows.length === 0) return;

  await adminPool.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const row of rows) {
    await adminPool.query(`TRUNCATE TABLE \`${row.tableName}\``);
  }
  await adminPool.query('SET FOREIGN_KEY_CHECKS = 1');
}

let closed = false;
export async function closeTestDb() {
  if (closed) return;
  closed = true;
  await pool.end();
  await adminPool.end();
}

export { schema };
