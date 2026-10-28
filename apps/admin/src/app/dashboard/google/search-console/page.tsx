import Link from 'next/link';
import { getConnectionForScope, getValidAccessToken, recordSuccessfulSync, classifyGoogleApiError } from '@/lib/google/connections';
import { listAccessibleSites, querySearchAnalytics, getSearchConsoleSelection, type SearchConsoleSite } from '@/lib/google/searchConsole';
import { findSeoOpportunities, pathFromFullUrl } from '@/lib/google/seoOpportunities';
import { selectSearchConsoleSite, verifySearchConsoleConnection } from './actions';

function dateNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A domain property's siteUrl comes back from the API as "sc-domain:example.com" — never a real URL. See https://developers.google.com/webmaster-tools/v1/sites. */
function isDomainProperty(siteUrl: string): boolean {
  return siteUrl.startsWith('sc-domain:');
}

const ALLOWED_DAY_RANGES = [7, 28, 90] as const;
type DayRange = (typeof ALLOWED_DAY_RANGES)[number];

function parseDayRange(value: string | undefined): DayRange {
  const n = Number(value);
  return (ALLOWED_DAY_RANGES as readonly number[]).includes(n) ? (n as DayRange) : 28;
}

export default async function SearchConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; error?: string; days?: string }>;
}) {
  const { change, error, days } = await searchParams;
  const dayRange = parseDayRange(days);
  const connection = await getConnectionForScope('search_console');

  if (!connection || connection.status !== 'connected') {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Search Console</h1>
        <p className="text-sm text-text-muted">
          Not connected yet. <Link href="/dashboard/google" className="text-neon underline">Connect Google Search Console</Link> first.
        </p>
      </div>
    );
  }

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Search Console</h1>
        <p className="text-sm text-danger">No usable access token for this connection. Reconnect from the Google integrations page.</p>
      </div>
    );
  }

  const selection = await getSearchConsoleSelection(connection.id);
  const showPicker = change === '1' || !selection;

  let sites: SearchConsoleSite[] = [];
  let listError: string | null = null;
  if (showPicker) {
    try {
      sites = await listAccessibleSites(accessToken);
    } catch (err) {
      listError = classifyGoogleApiError(err).message;
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Search Console</h1>
      {error && <p className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

      {showPicker ? (
        <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
          <p className="text-sm text-text-muted">
            Select which property this Google account can access. Nothing is saved until the selection is tested
            against a real Search Analytics query. Changing this never happens automatically — your current
            selection (if any) stays active until you explicitly save a new one here.
          </p>
          <p className="text-xs text-text-muted">
            <strong className="text-text">Domain property</strong> (shown as <code>sc-domain:…</code>) covers every
            protocol, subdomain and path verified for that domain in one property. <strong className="text-text">URL-prefix
            property</strong> (shown as a full <code>https://…</code> URL) covers only that exact prefix. If both are
            listed below, they may report different totals for the same site — pick the one Google Search Console
            itself treats as authoritative for your reporting.
          </p>
          {listError && <p className="text-sm text-danger">{listError}</p>}
          {!listError && sites.length === 0 && (
            <p className="text-sm text-warn">No accessible Search Console properties found for this Google account.</p>
          )}
          {sites.length > 0 && (
            <form action={selectSearchConsoleSite} className="space-y-3">
              <div className="space-y-2">
                {sites.map((site) => (
                  <label key={site.siteUrl} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="siteUrl" value={site.siteUrl} required defaultChecked={site.siteUrl === selection?.siteUrl} />
                    <span>{site.siteUrl}</span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                      {isDomainProperty(site.siteUrl) ? 'Domain property' : 'URL-prefix property'}
                    </span>
                    <span className="text-xs text-text-muted">({site.permissionLevel})</span>
                  </label>
                ))}
              </div>
              <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
                Test &amp; save selection
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Selected property: <span className="font-medium">{selection.siteUrl}</span>{' '}
              {selection.siteUrl && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                  {isDomainProperty(selection.siteUrl) ? 'Domain property' : 'URL-prefix property'}
                </span>
              )}{' '}
              <span className="text-xs text-text-muted">({selection.permissionLevel})</span>
            </p>
            <div className="flex gap-2">
              <form action={verifySearchConsoleConnection}>
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                  Test connection
                </button>
              </form>
              <Link href="/dashboard/google/search-console?change=1" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                Change property
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Last synced: {connection.lastSyncedAt ? connection.lastSyncedAt.toLocaleString() : 'never — no successful data read yet'}.
          </p>
        </div>
      )}

      {selection?.siteUrl && !showPicker && (
        <>
          <div className="flex gap-2 text-xs">
            {ALLOWED_DAY_RANGES.map((d) => (
              <Link
                key={d}
                href={`/dashboard/google/search-console?days=${d}`}
                className={`rounded-md border px-2.5 py-1 ${d === dayRange ? 'border-neon text-neon' : 'border-border text-text-muted'}`}
              >
                Last {d} days
              </Link>
            ))}
          </div>
          <PerformancePanel accessToken={accessToken} siteUrl={selection.siteUrl} connectionId={connection.id} days={dayRange} />
        </>
      )}
    </div>
  );
}

async function PerformancePanel({
  accessToken,
  siteUrl,
  connectionId,
  days,
}: {
  accessToken: string;
  siteUrl: string;
  connectionId: string;
  days: DayRange;
}) {
  let topQueries: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let topPages: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let topCountries: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let topDevices: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let opportunityRows: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let fetchError: ReturnType<typeof classifyGoogleApiError> | null = null;

  try {
    const startDate = dateNDaysAgo(days);
    const endDate = dateNDaysAgo(0);
    [topQueries, topPages, topCountries, topDevices, opportunityRows] = await Promise.all([
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['page'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['country'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['device'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['page'], rowLimit: 50 }),
    ]);
    // Only a genuinely successful read advances "last synced" — a
    // failure below leaves whatever the last real success was untouched.
    await recordSuccessfulSync(connectionId, 'search_console_report');
  } catch (err) {
    fetchError = classifyGoogleApiError(err);
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
        <p className="text-sm text-danger">{fetchError.message}</p>
        {fetchError.kind === 'unknown' && <p className="mt-1 text-xs text-text-muted">Raw error, for diagnosis: {fetchError.message}</p>}
      </div>
    );
  }

  const opportunities = findSeoOpportunities(opportunityRows);

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">Last {days} days — Source: Google Search Console API</p>
      <PerformanceTable title="Top queries" rows={topQueries} />
      <PerformanceTable title="Top pages" rows={topPages} />
      <PerformanceTable title="Top countries" rows={topCountries} />
      <PerformanceTable title="Top devices" rows={topDevices} />

      <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
        <h2 className="mb-1 font-medium">SEO opportunities</h2>
        <p className="mb-3 text-xs text-text-muted">
          Pages with real impression volume whose click-through rate is notably below typical for their position —
          worth a human look, not a promise that changing anything will move rankings.
        </p>
        {opportunities.length === 0 ? (
          <p className="text-sm text-text-muted">No flagged pages for this period.</p>
        ) : (
          <ul className="space-y-3">
            {opportunities.map((opp) => (
              <li key={opp.page} className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                <div>
                  <p className="font-medium">{opp.page}</p>
                  <p className="text-xs text-text-muted">
                    {opp.impressions} impressions, {opp.clicks} clicks, {(opp.ctr * 100).toFixed(2)}% CTR, avg.
                    position {opp.position.toFixed(1)} — {opp.note}
                  </p>
                </div>
                <a
                  href={`/dashboard/seo/pages/new?path=${encodeURIComponent(pathFromFullUrl(opp.page))}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-text-muted"
                >
                  Review
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PerformanceTable({ title, rows }: { title: string; rows: Awaited<ReturnType<typeof querySearchAnalytics>> }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
      <h2 className="mb-2 font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-text-muted">No data for this period.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-1">Key</th>
              <th className="pb-1">Clicks</th>
              <th className="pb-1">Impressions</th>
              <th className="pb-1">CTR</th>
              <th className="pb-1">Avg. position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-1">{row.keys[0]}</td>
                <td className="py-1">{row.clicks}</td>
                <td className="py-1">{row.impressions}</td>
                <td className="py-1">{(row.ctr * 100).toFixed(1)}%</td>
                <td className="py-1">{row.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
