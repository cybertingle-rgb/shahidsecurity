import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { logSyncError, getLatestError } from '@/lib/google/connections';

afterAll(closeTestDb);

async function makeConnection() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.googleConnections).values({ id, scope: 'search_console' });
  return id;
}

describe('logSyncError / getLatestError', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('returns null when nothing has ever failed for this connection', async () => {
    const connectionId = await makeConnection();
    expect(await getLatestError(connectionId)).toBeNull();
  });

  it('returns the logged error after a failure', async () => {
    const connectionId = await makeConnection();
    await logSyncError(connectionId, 'search_console_selection', 'Search Analytics query failed: 403 forbidden');

    const latest = await getLatestError(connectionId);
    expect(latest?.errorMessage).toBe('Search Analytics query failed: 403 forbidden');
    expect(latest?.syncType).toBe('search_console_selection');
  });

  it('returns null again once a later sync succeeds, even though an earlier error exists', async () => {
    const connectionId = await makeConnection();
    await logSyncError(connectionId, 'search_console_selection', 'first failure');
    await testDb.insert(schema.googleSyncLogs).values({ id: crypto.randomUUID(), connectionId, syncType: 'search_console_selection', status: 'success' });

    expect(await getLatestError(connectionId)).toBeNull();
  });

  it('never includes anything resembling a token value in the logged message', async () => {
    const connectionId = await makeConnection();
    const message = 'Request failed: 401 Unauthorized';
    await logSyncError(connectionId, 'analytics_selection', message);

    const latest = await getLatestError(connectionId);
    expect(latest?.errorMessage).not.toMatch(/ya29\.|refresh_token|access_token/i);
  });
});
