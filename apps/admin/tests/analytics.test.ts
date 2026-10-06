import { describe, it, expect, afterEach, afterAll, beforeEach, vi } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import {
  listAccessibleProperties,
  getPropertyDetails,
  runAnalyticsReport,
  testAnalyticsAccess,
  saveAnalyticsSelection,
  getAnalyticsSelection,
} from '@/lib/google/analytics';

afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listAccessibleProperties', () => {
  it('flattens accounts and their properties into one list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          accountSummaries: [
            {
              displayName: 'Shahid Security',
              propertySummaries: [
                { property: 'properties/123456789', displayName: 'shahidiqbal.com' },
                { property: 'properties/987654321', displayName: 'Old property' },
              ],
            },
          ],
        }),
      })),
    );

    const properties = await listAccessibleProperties('fake-token');
    expect(properties).toEqual([
      { accountName: 'Shahid Security', propertyId: '123456789', propertyName: 'shahidiqbal.com' },
      { accountName: 'Shahid Security', propertyId: '987654321', propertyName: 'Old property' },
    ]);
  });

  it('returns an empty list when the account has no accessible properties', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    expect(await listAccessibleProperties('fake-token')).toEqual([]);
  });

  it('throws with the real status code on a failed request', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'invalid_token' })));
    await expect(listAccessibleProperties('fake-token')).rejects.toThrow(/401/);
  });
});

describe('getPropertyDetails', () => {
  it('reads timezone and currency from the real API response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ timeZone: 'Asia/Dubai', currencyCode: 'AED' }) })));
    expect(await getPropertyDetails('fake-token', '123456789')).toEqual({ timezone: 'Asia/Dubai', currency: 'AED' });
  });
});

describe('runAnalyticsReport', () => {
  it('sends the requested date range, dimensions, and metrics', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ rows: [] }) }));
    vi.stubGlobal('fetch', fetchMock);

    await runAnalyticsReport('fake-token', '123456789', {
      startDate: '2026-01-01',
      endDate: '2026-01-28',
      dimensions: ['pagePath'],
      metrics: ['screenPageViews'],
      limit: 10,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('123456789');
    const body = JSON.parse(init.body as string);
    expect(body.dateRanges).toEqual([{ startDate: '2026-01-01', endDate: '2026-01-28' }]);
    expect(body.dimensions).toEqual([{ name: 'pagePath' }]);
    expect(body.metrics).toEqual([{ name: 'screenPageViews' }]);
    expect(body.limit).toBe(10);
  });

  it('maps the real row values, including numeric parsing of metric strings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          rows: [{ dimensionValues: [{ value: '/blog/example/' }], metricValues: [{ value: '42' }] }],
        }),
      })),
    );

    const rows = await runAnalyticsReport('fake-token', '123456789', { startDate: '2026-01-01', endDate: '2026-01-28', metrics: ['screenPageViews'] });
    expect(rows).toEqual([{ dimensionValues: ['/blog/example/'], metricValues: [42] }]);
  });
});

describe('testAnalyticsAccess', () => {
  it('propagates a failure as a thrown error rather than silently succeeding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, text: async () => 'forbidden' })));
    await expect(testAnalyticsAccess('fake-token', '123456789')).rejects.toThrow(/403/);
  });
});

describe('saveAnalyticsSelection / getAnalyticsSelection', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('creates a new selection row for a connection with none yet', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'analytics' });

    await saveAnalyticsSelection(connectionId, { propertyId: '123456789', propertyName: 'shahidiqbal.com', timezone: 'Asia/Dubai', currency: 'AED' });

    const selection = await getAnalyticsSelection(connectionId);
    expect(selection?.propertyId).toBe('123456789');
    expect(selection?.timezone).toBe('Asia/Dubai');
  });

  it('replaces an existing selection rather than creating a second row', async () => {
    const connectionId = crypto.randomUUID();
    await testDb.insert(schema.googleConnections).values({ id: connectionId, scope: 'analytics' });

    await saveAnalyticsSelection(connectionId, { propertyId: '111', propertyName: 'Old', timezone: 'UTC', currency: 'USD' });
    await saveAnalyticsSelection(connectionId, { propertyId: '222', propertyName: 'New', timezone: 'Asia/Dubai', currency: 'AED' });

    const rows = await testDb.select().from(schema.analyticsConnections);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.propertyId).toBe('222');
  });
});
