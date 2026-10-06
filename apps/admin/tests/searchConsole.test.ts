import { describe, it, expect, afterEach, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import {
  listAccessibleSites,
  querySearchAnalytics,
  testSearchConsoleAccess,
  saveSearchConsoleSelection,
  getSearchConsoleSelection,
} from '@/lib/google/searchConsole';

afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listAccessibleSites', () => {
  it('maps the real API response into siteUrl/permissionLevel pairs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          siteEntry: [
            { siteUrl: 'sc-domain:shahidiqbal.com', permissionLevel: 'siteOwner' },
            { siteUrl: 'https://old-domain.example/', permissionLevel: 'siteRestrictedUser' },
          ],
        }),
      })),
    );

    const sites = await listAccessibleSites('fake-token');
    expect(sites).toEqual([
      { siteUrl: 'sc-domain:shahidiqbal.com', permissionLevel: 'siteOwner' },
      { siteUrl: 'https://old-domain.example/', permissionLevel: 'siteRestrictedUser' },
    ]);
  });

  it('returns an empty list rather than throwing when the account has no sites', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    expect(await listAccessibleSites('fake-token')).toEqual([]);
  });

  it('throws with the real status code on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'invalid_token' })));
    await expect(listAccessibleSites('fake-token')).rejects.toThrow(/401/);
  });
});

describe('querySearchAnalytics', () => {
  it('sends the requested date range, dimensions, and row limit', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ rows: [] }) }));
    vi.stubGlobal('fetch', fetchMock);

    await querySearchAnalytics('fake-token', 'sc-domain:shahidiqbal.com', {
      startDate: '2026-01-01',
      endDate: '2026-01-28',
      dimensions: ['query'],
      rowLimit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(encodeURIComponent('sc-domain:shahidiqbal.com'));
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ startDate: '2026-01-01', endDate: '2026-01-28', dimensions: ['query'], rowLimit: 10 });
  });

  it('returns the real rows the API responds with', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ rows: [{ keys: ['cybersecurity dubai'], clicks: 12, impressions: 340, ctr: 0.035, position: 8.2 }] }),
      })),
    );

    const rows = await querySearchAnalytics('fake-token', 'sc-domain:shahidiqbal.com', { startDate: '2026-01-01', endDate: '2026-01-28' });
    expect(rows).toEqual([{ keys: ['cybersecurity dubai'], clicks: 12, impressions: 340, ctr: 0.035, position: 8.2 }]);
  });
});

describe('testSearchConsoleAccess', () => {
  it('queries a real ~7-day range with a minimal row limit', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ rows: [] }) }));
    vi.stubGlobal('fetch', fetchMock);

    await testSearchConsoleAccess('fake-token', 'sc-domain:shahidiqbal.com');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.rowLimit).toBe(1);
    expect(new Date(body.endDate).getTime() - new Date(body.startDate).getTime()).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
  });

  it('propagates a failure as a thrown error rather than silently succeeding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, text: async () => 'forbidden' })));
    await expect(testSearchConsoleAccess('fake-token', 'sc-domain:shahidiqbal.com')).rejects.toThrow(/403/);
  });
});

describe('saveSearchConsoleSelection / getSearchConsoleSelection', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('creates a new selection row for a connection with none yet', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'search_console' });

    await saveSearchConsoleSelection(connectionId, 'sc-domain:shahidiqbal.com', 'siteOwner');

    const selection = await getSearchConsoleSelection(connectionId);
    expect(selection?.siteUrl).toBe('sc-domain:shahidiqbal.com');
    expect(selection?.permissionLevel).toBe('siteOwner');
  });

  it('replaces an existing selection rather than creating a second row', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'search_console' });

    await saveSearchConsoleSelection(connectionId, 'sc-domain:old.example', 'siteOwner');
    await saveSearchConsoleSelection(connectionId, 'sc-domain:shahidiqbal.com', 'siteOwner');

    const rows = await testDb.select().from(schema.searchConsoleConnections);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.siteUrl).toBe('sc-domain:shahidiqbal.com');
  });
});
