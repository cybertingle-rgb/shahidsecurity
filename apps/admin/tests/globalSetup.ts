import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'mysql://admin_dev:admin_dev_password@127.0.0.1:3306/shahid_security_admin_test';

export async function setup() {
  const connection = await mysql.createConnection({ uri: TEST_DATABASE_URL });
  const db = drizzle(connection, { mode: 'default' });
  await migrate(db, { migrationsFolder: './drizzle' });
  await connection.end();
}
