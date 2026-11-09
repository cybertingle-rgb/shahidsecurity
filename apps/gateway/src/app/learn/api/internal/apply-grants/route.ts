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
 * for why MySQL's additive privilege model requires granting table-by-
 * table rather than revoking from a broad grant.
 *
 * Tolerates lacking CREATE USER / GRANT privilege: confirmed against a
 * real Hostinger-issued "admin" MySQL user — shared hosting routinely
 * gives customers full rights on their own database but never
 * account-level CREATE USER/GRANT rights (those stay behind hPanel's own
 * UI). When that's the case, DATABASE_URL's user has to already exist
 * (created by hand in hPanel) with whatever privileges it already has —
 * this reports that rather than failing the whole deploy over something
 * no connection string on this host was ever going to be allowed to do.
 */
const isPrivilegeError = (err: unknown): boolean => {
  // Confirmed against a real run: MySQL phrases this differently per
  // statement — CREATE USER's denial says "Access denied; you need ...
  // privilege(s)", but GRANT's says "GRANT command denied to user ...",
  // neither of which the other's wording matches. mysql2 error objects
  // carry a stable `.code` (e.g. ER_SPECIFIC_ACCESS_DENIED_ERROR,
  // ER_TABLEACCESS_DENIED_ERROR, ER_DBACCESS_DENIED_ERROR) across every
  // privilege-denial variant, which is what this actually checks; the
  // message regex is only a fallback for whatever that code check misses.
  const code = (err as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && /ACCESS_DENIED/.test(code)) return true;
  return err instanceof Error && /denied/i.test(err.message);
};
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
  const notes: string[] = [];
  try {
    try {
      await connection.query(`CREATE USER IF NOT EXISTS '${appUser}'@'${appHost}' IDENTIFIED BY ${connection.escape(appPassword)}`);
    } catch (err) {
      if (!isPrivilegeError(err)) throw err;
      notes.push(`Skipped CREATE USER (no privilege) — assuming '${appUser}'@'${appHost}' already exists via hPanel.`);
    }

    const [tableRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ?`,
      [database],
    );
    const tableNames = tableRows.map((r) => String(r.tableName));
    if (tableNames.length === 0) {
      return NextResponse.json({ error: `No tables found in ${database} — run migrations before this.` }, { status: 500 });
    }

    let granted = 0;
    const deniedTables: string[] = [];
    for (const table of tableNames) {
      const privileges = table === 'audit_logs' ? 'SELECT, INSERT' : 'SELECT, INSERT, UPDATE, DELETE';
      try {
        await connection.query(`GRANT ${privileges} ON \`${database}\`.\`${table}\` TO '${appUser}'@'${appHost}'`);
        granted += 1;
      } catch (err) {
        if (!isPrivilegeError(err)) throw err;
        deniedTables.push(table);
      }
    }
    if (deniedTables.length > 0) {
      notes.push(
        `No GRANT privilege — could not set table-level grants for: ${deniedTables.join(', ')}. ` +
          `'${appUser}'@'${appHost}' is relying on whatever privileges hPanel already gave it (likely broader than intended, since this couldn't narrow them to SELECT/INSERT/UPDATE/DELETE per table).`,
      );
    } else {
      try {
        await connection.query('FLUSH PRIVILEGES');
      } catch (err) {
        if (!isPrivilegeError(err)) throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Granted privileges on ${granted}/${tableNames.length} tables to '${appUser}'@'${appHost}'.`,
      notes,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err), notes }, { status: 500 });
  } finally {
    await connection.end();
  }
}
