import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { analyticsConnections, type AnalyticsConnection } from '@/db/schema';

// GA4 Admin API (current, non-deprecated) — accountSummaries is the
// documented way to enumerate every account/property combination a
// user can access in one call:
// https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list
const ACCOUNT_SUMMARIES_ENDPOINT = 'https://analyticsadmin.googleapis.com/v1beta/accountSummaries';
const PROPERTIES_ENDPOINT = 'https://analyticsadmin.googleapis.com/v1beta/properties';
// GA4 Data API — the current reporting endpoint (replaces the
// deprecated Universal Analytics Reporting API this app never uses):
// https://developers.google.com/analytics/devguides/reporting/data/v1
const RUN_REPORT_ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';

export type AnalyticsProperty = {
  accountName: string;
  propertyId: string;
  propertyName: string;
};

/** Lists every GA4 property the authenticated Google account can access — never assumed, never hard-coded. */
export async function listAccessibleProperties(accessToken: string): Promise<AnalyticsProperty[]> {
  const res = await fetch(ACCOUNT_SUMMARIES_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Failed to list Analytics accounts: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as {
    accountSummaries?: Array<{
      displayName: string;
      propertySummaries?: Array<{ property: string; displayName: string }>;
    }>;
  };

  const properties: AnalyticsProperty[] = [];
  for (const account of data.accountSummaries ?? []) {
    for (const property of account.propertySummaries ?? []) {
      // `property` comes back as "properties/123456789" — the Data API
      // wants just the numeric id.
      const propertyId = property.property.replace(/^properties\//, '');
      properties.push({ accountName: account.displayName, propertyId, propertyName: property.displayName });
    }
  }
  return properties;
}

export type PropertyDetails = { timezone: string; currency: string };

/** Reads a specific property's timezone/currency — shown in the picker so the admin confirms the right one before saving. */
export async function getPropertyDetails(accessToken: string, propertyId: string): Promise<PropertyDetails> {
  const res = await fetch(`${PROPERTIES_ENDPOINT}/${encodeURIComponent(propertyId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to read property details: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { timeZone?: string; currencyCode?: string };
  return { timezone: data.timeZone ?? 'unknown', currency: data.currencyCode ?? 'unknown' };
}

export type AnalyticsReportRow = {
  dimensionValues: string[];
  metricValues: number[];
};

/** Runs a real GA4 report — every number here comes straight from Google; nothing is estimated or invented. */
export async function runAnalyticsReport(
  accessToken: string,
  propertyId: string,
  params: { startDate: string; endDate: string; dimensions?: string[]; metrics: string[]; limit?: number },
): Promise<AnalyticsReportRow[]> {
  const res = await fetch(`${RUN_REPORT_ENDPOINT}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: params.startDate, endDate: params.endDate }],
      dimensions: (params.dimensions ?? []).map((name) => ({ name })),
      metrics: params.metrics.map((name) => ({ name })),
      limit: params.limit ?? 25,
    }),
  });
  if (!res.ok) {
    throw new Error(`Analytics report query failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as {
    rows?: Array<{ dimensionValues?: Array<{ value: string }>; metricValues?: Array<{ value: string }> }>;
  };
  return (data.rows ?? []).map((row) => ({
    dimensionValues: (row.dimensionValues ?? []).map((v) => v.value),
    metricValues: (row.metricValues ?? []).map((v) => Number(v.value)),
  }));
}

/** A minimal real report used purely to confirm access before saving a property selection — throws if the account can't actually query it. */
export async function testAnalyticsAccess(accessToken: string, propertyId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await runAnalyticsReport(accessToken, propertyId, { startDate: weekAgo, endDate: today, metrics: ['activeUsers'], limit: 1 });
}

export async function getAnalyticsSelection(connectionId: string): Promise<AnalyticsConnection | null> {
  const rows = await db.select().from(analyticsConnections).where(eq(analyticsConnections.connectionId, connectionId)).limit(1);
  return rows[0] ?? null;
}

export async function saveAnalyticsSelection(
  connectionId: string,
  selection: { propertyId: string; propertyName: string; timezone: string; currency: string },
): Promise<void> {
  const existing = await getAnalyticsSelection(connectionId);
  if (existing) {
    await db.update(analyticsConnections).set({ ...selection, updatedAt: new Date() }).where(eq(analyticsConnections.id, existing.id));
  } else {
    await db.insert(analyticsConnections).values({ id: crypto.randomUUID(), connectionId, ...selection });
  }
}
