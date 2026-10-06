import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

// A full-privilege connection, deliberately not the app's narrow runtime
// user (admin_dev — see src/db/apply-grants.ts, which strips DDL from it
// entirely) — this needs CREATE TABLE for drizzle's own migrations
// tracking table, which that user must never have.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'mysql://root@127.0.0.1:3306/shahid_security_admin_test';

export async function setup() {
  const connection = await mysql.createConnection({ uri: TEST_DATABASE_URL });
  const db = drizzle(connection, { mode: 'default' });
  await migrate(db, { migrationsFolder: './drizzle' });
  await connection.end();
}
