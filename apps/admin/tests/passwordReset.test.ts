import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { createPasswordResetToken, consumePasswordResetToken } from '@/lib/auth/tokens';

afterAll(closeTestDb);

async function makeUser() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.adminUsers).values({ id, email: `${id}@test.local`, passwordHash: 'x', fullName: 'Test User' });
  return id;
}

describe('createPasswordResetToken / consumePasswordResetToken', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('a freshly created token resolves to the real user id', async () => {
    const userId = await makeUser();
    const token = await createPasswordResetToken(userId);
    expect(await consumePasswordResetToken(token)).toBe(userId);
  });

  it('never stores the raw token — only a hash is persisted', async () => {
    const userId = await makeUser();
    const token = await createPasswordResetToken(userId);
    const rows = await testDb.select().from(schema.adminPasswordResetTokens);
    expect(rows[0]?.tokenHash).not.toBe(token);
    expect(rows[0]?.tokenHash).toHaveLength(64); // sha256 hex
  });

  it('is single-use — a second consume attempt fails', async () => {
    const userId = await makeUser();
    const token = await createPasswordResetToken(userId);
    expect(await consumePasswordResetToken(token)).toBe(userId);
    expect(await consumePasswordResetToken(token)).toBeNull();
  });

  it('rejects a token that was never issued', async () => {
    expect(await consumePasswordResetToken('not-a-real-token')).toBeNull();
  });

  it('rejects an expired token', async () => {
    const userId = await makeUser();
    const knownToken = 'known-plaintext-token-for-this-test';
    const tokenHash = createHash('sha256').update(knownToken).digest('hex');
    await testDb.insert(schema.adminPasswordResetTokens).values({
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
    });

    expect(await consumePasswordResetToken(knownToken)).toBeNull();
  });
});
