import { describe, it, expect, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import {
  listAccounts,
  listLocationsForAccount,
  testBusinessProfileAccess,
  saveBusinessProfileSelection,
  syncBusinessProfile,
  getCachedBusinessProfile,
} from '@/lib/google/businessProfile';

afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listAccounts', () => {
  it('maps the real API response into accountId/accountName pairs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ accounts: [{ name: 'accounts/111', accountName: 'Shahid Security LLC' }] }),
      })),
    );
    expect(await listAccounts('fake-token')).toEqual([{ accountId: 'accounts/111', accountName: 'Shahid Security LLC' }]);
  });

  it('throws with the real status code on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, text: async () => 'forbidden' })));
    await expect(listAccounts('fake-token')).rejects.toThrow(/403/);
  });
});

describe('listLocationsForAccount', () => {
  it('maps the real API response into locationId/title pairs, never assuming a default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          locations: [
            { name: 'locations/222', title: 'Dubai Office' },
            { name: 'locations/333', title: 'Abu Dhabi Office' },
          ],
        }),
      })),
    );
    const locations = await listLocationsForAccount('fake-token', 'accounts/111');
    expect(locations).toHaveLength(2);
    expect(locations[0]).toEqual({ locationId: 'locations/222', title: 'Dubai Office' });
  });
});

describe('testBusinessProfileAccess', () => {
  it('propagates a failure rather than silently succeeding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, text: async () => 'not found' })));
    await expect(testBusinessProfileAccess('fake-token', 'locations/222')).rejects.toThrow(/404/);
  });

  it('succeeds silently on a real successful read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ name: 'locations/222' }) })));
    await expect(testBusinessProfileAccess('fake-token', 'locations/222')).resolves.toBeUndefined();
  });
});

describe('saveBusinessProfileSelection / syncBusinessProfile', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('saves an explicit account+location selection', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'business_profile' });

    await saveBusinessProfileSelection(connectionId, { accountId: 'accounts/111', locationId: 'locations/222', locationName: 'Dubai Office' });

    const cached = await getCachedBusinessProfile(connectionId);
    expect(cached?.googleAccountId).toBe('accounts/111');
    expect(cached?.googleLocationId).toBe('locations/222');
    expect(cached?.locationName).toBe('Dubai Office');
  });

  it('refuses to sync when no location has been explicitly selected yet', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'business_profile', status: 'connected' });

    await expect(syncBusinessProfile({ id: connectionId } as never, 'fake-token')).rejects.toThrow(/No location selected/);
  });

  it('re-reads only the already-selected location, never a freshly-listed "first" one', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'business_profile' });
    await saveBusinessProfileSelection(connectionId, { accountId: 'accounts/111', locationId: 'locations/222', locationName: 'Old Name' });

    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ title: 'Updated Name' }) }));
    vi.stubGlobal('fetch', fetchMock);

    await syncBusinessProfile({ id: connectionId } as never, 'fake-token');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('locations/222');
    const cached = await getCachedBusinessProfile(connectionId);
    expect(cached?.locationName).toBe('Updated Name');
  });
});
