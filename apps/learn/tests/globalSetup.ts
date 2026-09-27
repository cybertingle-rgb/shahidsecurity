import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://learn_dev:learn_dev_password@localhost:5432/learn_with_shahid_test';

export async function setup() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
  await pool.end();
}
