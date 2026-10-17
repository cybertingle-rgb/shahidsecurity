import { NextRequest, NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

/**
 * Same reasoning as this directory's migrate/route.ts: this host builds
 * the app in an isolated environment with no shell access to the
 * deployed server, so src/db/apply-grants.ts's logic has to run from
 * inside the already-running process instead of as a CI step. Reuses
 * MIGRATE_SECRET rather than adding a second secret — both routes are
 * the same class of "privileged one-time setup action", gated the same
 * way. Remove this route once initial setup is done, same as migrate's.
 *
 * Logic mirrors src/db/apply-grants.ts exactly — see that file's comment
 * (and apps/learn's twin, which explains the reasoning in full) for why
 * MySQL's additive privilege model requires granting table-by-table
 * rather than revoking from a broad grant.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MIGRATE_SECRET;
  const provided = request.headers.get('x-migrate-secret');

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminConnectionString = process.env.DATABASE_ADMIN_URL;
  const appConnectionString = process.env.DATABASE_URL;
  if (!adminConnectionString) {
    return NextResponse.json({ error: 'DATABASE_ADMIN_URL is not set' }, { status: 500 });
  }
  if (!appConnectionString) {
    return NextResponse.json({ error: 'DATABASE_URL is not set' }, { status: 500 });
  }

  const appUrl = new URL(appConnectionString);
  const appUser = decodeURIComponent(appUrl.username);
  const appPassword = decodeURIComponent(appUrl.password);
  const database = appUrl.pathname.replace(/^\//, '');
  const appHost = process.env.DATABASE_APP_HOST ?? '%';
  if (!appUser || !appPassword || !database) {
    return NextResponse.json(
      { error: `Could not parse app user/password/database from DATABASE_URL (got user=${appUser} db=${database})` },
      { status: 500 },
    );
  }

  const connection = await mysql.createConnection({ uri: adminConnectionString, multipleStatements: true });
  try {
    await connection.query(`CREATE USER IF NOT EXISTS '${appUser}'@'${appHost}' IDENTIFIED BY ${connection.escape(appPassword)}`);

    const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ?`,
      [database],
    );
    const tableNames = tableRows.map((r) => String(r.tableName));
    if (tableNames.length === 0) {
      return NextResponse.json({ error: `No tables found in ${database} — run migrations before this.` }, { status: 500 });
    }

    for (const table of tableNames) {
      const privileges = table === 'audit_logs' ? 'SELECT, INSERT' : 'SELECT, INSERT, UPDATE, DELETE';
      await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${table}\` TO '${appUser}'@'${appHost}'`);
    }
    await connection.query('FLUSH PRIVILEGES');

    return NextResponse.json({
      success: true,
      message: `Granted privileges on ${tableNames.length} tables to '${appUser}'@'${appHost}'.`,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  } finally {
    await connection.end();
  }
}
