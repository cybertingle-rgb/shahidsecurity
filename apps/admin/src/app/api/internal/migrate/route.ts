import { NextRequest, NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';

/**
 * Same reasoning as apps/learn/src/app/api/internal/migrate/route.ts:
 * this host builds the app with no interactive shell access to the
 * deployed environment, so migrations run over HTTP instead. Secret-
 * gated by MIGRATE_SECRET (a separate value from apps/learn's — never
 * reuse a secret across the two apps). Remove this route once initial
 * setup is done.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = request.headers.get('x-migrate-secret');

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: 'DATABASE_ADMIN_URL or DATABASE_URL is not set' }, { status: 500 });
  }

  const connection = await mysql.createConnection({ uri: connectionString });
  try {
    const db = drizzle(connection, { mode: 'default' });
    await migrate(db, { migrationsFolder: './drizzle' });
    return NextResponse.json({ success: true, message: 'Migrations complete.' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    await connection.end();
  }
}
