import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from '../src/db/schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const testDb = drizzle(pool, { schema });

// A separate, privileged connection used ONLY for test cleanup — never by
// application code or by the tests themselves. It exists because
// truncateAll() must clear audit_logs too between tests, and the app's own
// runtime role (learn_dev, same as production would use) deliberately has
// no TRUNCATE/DELETE grant on that table (src/db/apply-grants.ts) — the
// exact restriction security.test.ts verifies. Local dev/test only; never
// wired to a staging or production connection string.
const adminPool = new Pool({ connectionString: process.env.TEST_DB_ADMIN_URL ?? 'postgres://postgres:localtestadminonly@127.0.0.1:5432/learn_with_shahid_test' });

/** Wipes all application tables (including audit_logs) between tests — this is the isolated test database, never dev or production. */
export async function truncateAll() {
  const { rows } = await adminPool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'`,
  );
  if (rows.length === 0) return;
  const tableList = rows.map((r) => `"${r.tablename}"`).join(', ');
  await adminPool.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

let closed = false;
export async function closeTestDb() {
  if (closed) return;
  closed = true;
  await pool.end();
  await adminPool.end();
}

export { schema, sql };
