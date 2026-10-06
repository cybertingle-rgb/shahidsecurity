import { describe, it, expect, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { getValidAccessToken } from '@/lib/google/connections';
import { encryptSecret } from '@/lib/crypto';

afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
});

async function makeConnection(overrides: Partial<typeof schema.googleConnections.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.googleConnections).values({
    id,
    scope: 'search_console',
    status: 'connected',
    accessTokenEnc: encryptSecret('current-access-token'),
    refreshTokenEnc: encryptSecret('a-real-refresh-token'),
    tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  });
  const [row] = await testDb.select().from(schema.googleConnections).where(eq(schema.googleConnections.id, id));
  if (!row) throw new Error('setup failed');
  return row;
}

describe('getValidAccessToken', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('returns the stored token unchanged when it is not near expiry', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const connection = await makeConnection({ tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) });

    const token = await getValidAccessToken(connection);

    expect(token).toBe('current-access-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes and persists a new token when the stored one is expired', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ access_token: 'brand-new-token', expires_in: 3600 }) })),
    );
    const connection = await makeConnection({ tokenExpiresAt: new Date(Date.now() - 1000) });

    const token = await getValidAccessToken(connection);

    expect(token).toBe('brand-new-token');
    const [updated] = await testDb.select().from(schema.googleConnections).where(eq(schema.googleConnections.id, connection.id));
    expect(updated?.tokenExpiresAt && updated.tokenExpiresAt.getTime() > Date.now()).toBe(true);
  });

  it('falls back to the stored token when there is no refresh token to renew with', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const connection = await makeConnection({ tokenExpiresAt: new Date(Date.now() - 1000), refreshTokenEnc: null });

    const token = await getValidAccessToken(connection);

    expect(token).toBe('current-access-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
