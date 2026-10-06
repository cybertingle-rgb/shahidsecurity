import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

async function main() {
  // Migrations run DDL, which the app's own narrow runtime user
  // deliberately doesn't have (see apply-grants.ts) — same pattern as
  // apps/learn/src/db/migrate.ts.
  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_ADMIN_URL or DATABASE_URL is required to run migrations');
  }

  const connection = await mysql.createConnection({ uri: connectionString });
  const db = drizzle(connection, { mode: 'default' });

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');

  await connection.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
