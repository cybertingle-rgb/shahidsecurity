import { describe, it, expect } from 'vitest';
import { Pool } from 'pg';

/**
 * Verifies the actual database-level grant, not just application code that
 * happens to never call UPDATE/DELETE on audit_logs — see
 * src/db/apply-grants.ts, applied to this test database by
 * `DATABASE_URL=... pnpm db:apply-grants` (documented in the LMS README).
 */
describe('audit_logs is insert-only at the database level', () => {
  it('the connected role can INSERT and SELECT', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      const inserted = await pool.query(`INSERT INTO audit_logs (action) VALUES ('test.action') RETURNING id`);
      expect(inserted.rows).toHaveLength(1);
      const selected = await pool.query(`SELECT * FROM audit_logs WHERE id = $1`, [inserted.rows[0].id]);
      expect(selected.rows).toHaveLength(1);
    } finally {
      await pool.end();
    }
  });

  it('the connected role CANNOT UPDATE an existing audit_logs row', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await expect(pool.query(`UPDATE audit_logs SET action = 'tampered' WHERE true`)).rejects.toThrow(/permission denied/i);
    } finally {
      await pool.end();
    }
  });

  it('the connected role CANNOT DELETE from audit_logs', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await expect(pool.query(`DELETE FROM audit_logs WHERE true`)).rejects.toThrow(/permission denied/i);
    } finally {
      await pool.end();
    }
  });

  it('the connected role CANNOT TRUNCATE audit_logs', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await expect(pool.query(`TRUNCATE audit_logs`)).rejects.toThrow(/permission denied/i);
    } finally {
      await pool.end();
    }
  });
});
