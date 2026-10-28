import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { recordSuccessfulSync, classifyGoogleApiError, getLatestError } from '@/lib/google/connections';

afterAll(closeTestDb);

describe('classifyGoogleApiError', () => {
  it('classifies a 401 as an expired/revoked token', () => {
    const result = classifyGoogleApiError(new Error('Failed to list Google Business accounts: 401 {"error":"invalid_token"}'));
    expect(result.kind).toBe('expired_token');
    expect(result.message).toMatch(/expired or was revoked/i);
  });

  it('classifies a 403 as permission denied', () => {
    const result = classifyGoogleApiError(new Error('Search Analytics query failed: 403 forbidden'));
    expect(result.kind).toBe('permission_denied');
    expect(result.message).toMatch(/does not have permission/i);
  });

  it('classifies a 429 as quota exceeded', () => {
    const result = classifyGoogleApiError(new Error('Failed to list Analytics accounts: 429 rateLimitExceeded'));
    expect(result.kind).toBe('quota_exceeded');
    expect(result.message).toMatch(/quota/i);
  });

  it('classifies a 404 as not found', () => {
    const result = classifyGoogleApiError(new Error('Failed to verify access to this location: 404 not found'));
    expect(result.kind).toBe('not_found');
    expect(result.message).toMatch(/could not be found/i);
  });

  it('falls back to the raw message for an unrecognized status', () => {
    const result = classifyGoogleApiError(new Error('Failed to list Google Business accounts: 500 internal error'));
    expect(result.kind).toBe('unknown');
    expect(result.message).toContain('500');
  });

  it('handles a non-Error throw without crashing', () => {
    const result = classifyGoogleApiError('a plain string throw');
    expect(result.kind).toBe('unknown');
    expect(result.message).toBe('a plain string throw');
  });
});

describe('recordSuccessfulSync', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('updates lastSyncedAt and logs a success row, distinct from the OAuth connection time', async () => {
    const connectionId = crypto.randomUUID();
    const connectedAt = new Date('2026-01-01T00:00:00Z');
    await testDb.insert(schema.googleConnections).values({
      id: connectionId,
      scope: 'search_console',
      status: 'connected',
      createdAt: connectedAt,
      lastSyncedAt: null,
    });

    await recordSuccessfulSync(connectionId, 'search_console_report');

    const [connection] = await testDb.select().from(schema.googleConnections).where(eq(schema.googleConnections.id, connectionId));
    expect(connection?.lastSyncedAt).not.toBeNull();
    // The point of this field: it must reflect the sync, not the original connect time.
    expect(connection?.lastSyncedAt?.getTime()).not.toBe(connectedAt.getTime());

    const logs = await testDb.select().from(schema.googleSyncLogs).where(eq(schema.googleSyncLogs.connectionId, connectionId));
    expect(logs).toHaveLength(1);
    expect(logs[0]?.status).toBe('success');
    expect(logs[0]?.syncType).toBe('search_console_report');
  });

  it('a prior error is no longer "latest" once a successful sync is recorded', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'analytics', status: 'connected' });
    await testDb.insert(schema.googleSyncLogs).values({
      id: crypto.randomUUID(),
      connectionId,
      syncType: 'analytics_report',
      status: 'error',
      errorMessage: 'Analytics report query failed: 401 expired',
    });
    expect(await getLatestError(connectionId)).not.toBeNull();

    await recordSuccessfulSync(connectionId, 'analytics_report');

    expect(await getLatestError(connectionId)).toBeNull();
  });

  it('each successful sync advances lastSyncedAt and appends a new log row rather than overwriting the last one', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'business_profile', status: 'connected', lastSyncedAt: null });

    await recordSuccessfulSync(connectionId, 'business_profile_sync');
    const [firstSync] = await testDb.select().from(schema.googleConnections).where(eq(schema.googleConnections.id, connectionId));
    const firstTimestamp = firstSync?.lastSyncedAt?.getTime();
    expect(firstTimestamp).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 5));
    await recordSuccessfulSync(connectionId, 'business_profile_sync');
    const [secondSync] = await testDb.select().from(schema.googleConnections).where(eq(schema.googleConnections.id, connectionId));

    expect(secondSync?.lastSyncedAt?.getTime()).toBeGreaterThanOrEqual(firstTimestamp!);
    const logs = await testDb.select().from(schema.googleSyncLogs).where(eq(schema.googleSyncLogs.connectionId, connectionId));
    expect(logs).toHaveLength(2);
  });
});
