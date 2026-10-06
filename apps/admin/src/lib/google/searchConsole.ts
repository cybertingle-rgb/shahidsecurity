import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { searchConsoleConnections, type SearchConsoleConnection } from '@/db/schema';

// Search Console API v1 ("Webmasters" API) — currently supported and
// documented at https://developers.google.com/webmaster-tools/v1/sites
// and .../searchanalytics/query. Both endpoints used here are the
// current, non-deprecated ones.
const SITES_ENDPOINT = 'https://www.googleapis.com/webmasters/v3/sites';

export type SearchConsoleSite = {
  siteUrl: string;
  permissionLevel: string;
};

/** Lists every Search Console property the authenticated Google account can access — never assumed, never hard-coded. */
export async function listAccessibleSites(accessToken: string): Promise<SearchConsoleSite[]> {
  const res = await fetch(SITES_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Failed to list Search Console sites: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { siteEntry?: Array<{ siteUrl: string; permissionLevel: string }> };
  return (data.siteEntry ?? []).map((s) => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
}

export type SearchAnalyticsDimension = 'query' | 'page' | 'country' | 'device' | 'date';

export type SearchAnalyticsRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Queries real Search Analytics data for one site — the same endpoint
 * the Search Console UI itself uses. Every number returned here comes
 * straight from Google; nothing here invents or estimates a metric.
 */
export async function querySearchAnalytics(
  accessToken: string,
  siteUrl: string,
  params: { startDate: string; endDate: string; dimensions?: SearchAnalyticsDimension[]; rowLimit?: number },
): Promise<SearchAnalyticsRow[]> {
  const res = await fetch(`${SITES_ENDPOINT}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions ?? [],
      rowLimit: params.rowLimit ?? 25,
    }),
  });
  if (!res.ok) {
    throw new Error(`Search Analytics query failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { rows?: SearchAnalyticsRow[] };
  return data.rows ?? [];
}

/** A minimal real query used purely to confirm access before saving a site selection — throws if the account can't actually query this site. */
export async function testSearchConsoleAccess(accessToken: string, siteUrl: string): Promise<void> {
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  await querySearchAnalytics(accessToken, siteUrl, {
    startDate: weekAgo.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    rowLimit: 1,
  });
}

export async function getSearchConsoleSelection(connectionId: string): Promise<SearchConsoleConnection | null> {
  const rows = await db.select().from(searchConsoleConnections).where(eq(searchConsoleConnections.connectionId, connectionId)).limit(1);
  return rows[0] ?? null;
}

export async function saveSearchConsoleSelection(connectionId: string, siteUrl: string, permissionLevel: string): Promise<void> {
  const existing = await getSearchConsoleSelection(connectionId);
  if (existing) {
    await db
      .update(searchConsoleConnections)
      .set({ siteUrl, permissionLevel, updatedAt: new Date() })
      .where(eq(searchConsoleConnections.id, existing.id));
  } else {
    await db.insert(searchConsoleConnections).values({ id: crypto.randomUUID(), connectionId, siteUrl, permissionLevel });
  }
}
