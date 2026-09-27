import { describe, it, expect } from 'vitest';
import mysql from 'mysql2/promise';

/**
 * Verifies the actual database-level grant, not just application code that
 * happens to never call UPDATE/DELETE on audit_logs — see
 * src/db/apply-grants.ts, applied to this test database by
 * `DATABASE_URL=... pnpm db:apply-grants` (documented in the LMS README).
 * MySQL implements TRUNCATE as an implicit DROP+CREATE, so revoking DROP
 * (not a separate TRUNCATE privilege, which MySQL doesn't have) is what
 * blocks the third test below.
 */
describe('audit_logs is insert-only at the database level', () => {
  it('the connected role can INSERT and SELECT', async () => {
    const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
    try {
      const id = crypto.randomUUID();
      // created_at has no DB-level default (Drizzle's $defaultFn generates
      // it client-side, which the app always does — this raw query has to
      // supply it explicitly since it bypasses the ORM on purpose).
      await connection.query(`INSERT INTO audit_logs (id, action, created_at) VALUES (?, ?, NOW())`, [id, 'test.action']);
      const [rows] = await connection.query<mysql.RowDataPacket[]>(`SELECT * FROM audit_logs WHERE id = ?`, [id]);
      expect(rows).toHaveLength(1);
    } finally {
      await connection.end();
    }
  });

  it('the connected role CANNOT UPDATE an existing audit_logs row', async () => {
    const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
    try {
      await expect(connection.query(`UPDATE audit_logs SET action = 'tampered' WHERE 1 = 1`)).rejects.toThrow(/command denied/i);
    } finally {
      await connection.end();
    }
  });

  it('the connected role CANNOT DELETE from audit_logs', async () => {
    const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
    try {
      await expect(connection.query(`DELETE FROM audit_logs WHERE 1 = 1`)).rejects.toThrow(/command denied/i);
    } finally {
      await connection.end();
    }
  });

  it('the connected role CANNOT TRUNCATE audit_logs', async () => {
    const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL });
    try {
      await expect(connection.query(`TRUNCATE audit_logs`)).rejects.toThrow(/command denied/i);
    } finally {
      await connection.end();
    }
  });
});
