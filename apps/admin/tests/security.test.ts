import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { logAudit } from '@/lib/audit';

afterAll(closeTestDb);

describe('audit_logs is insert-only at the database level', () => {
  beforeEach(truncateAll);

  it('the app\'s own runtime role can insert an audit row', async () => {
    await logAudit({ actorUserId: null, action: 'test.action', targetType: 'test', targetId: 'x' });
    const rows = await testDb.select().from(schema.auditLogs);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.action).toBe('test.action');
  });

  it('the app\'s own runtime role cannot UPDATE an audit_logs row — enforced by MySQL grants, not application code', async () => {
    await logAudit({ actorUserId: null, action: 'test.action', targetType: 'test', targetId: 'x' });
    // Drizzle wraps the real mysql2 error ("UPDATE command denied to user
    // ...") in its own "Failed query: ..." message, with the actual
    // driver error on .cause — assert on that, not the wrapper text.
    await expect(testDb.update(schema.auditLogs).set({ action: 'tampered' })).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/command denied/i) }),
    });
  });

  it('the app\'s own runtime role cannot DELETE an audit_logs row — same grant-level enforcement', async () => {
    await logAudit({ actorUserId: null, action: 'test.action', targetType: 'test', targetId: 'x' });
    await expect(testDb.delete(schema.auditLogs)).rejects.toMatchObject({
      cause: expect.objectContaining({ message: expect.stringMatching(/command denied/i) }),
    });
  });
});
