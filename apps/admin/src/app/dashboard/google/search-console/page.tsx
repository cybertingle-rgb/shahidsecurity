import Link from 'next/link';
import { getConnectionForScope, getValidAccessToken } from '@/lib/google/connections';
import { listAccessibleSites, querySearchAnalytics, getSearchConsoleSelection, type SearchConsoleSite } from '@/lib/google/searchConsole';
import { selectSearchConsoleSite } from './actions';

function dateNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function SearchConsolePage({ searchParams }: { searchParams: Promise<{ change?: string; error?: string }> }) {
  const { change, error } = await searchParams;
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
      listError = err instanceof Error ? err.message : 'Failed to list accessible sites.';
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
            against a real Search Analytics query.
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
              <span className="text-xs text-text-muted">({selection.permissionLevel})</span>
            </p>
            <Link href="/dashboard/google/search-console?change=1" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
              Change property
            </Link>
          </div>
        </div>
      )}

      {selection?.siteUrl && !showPicker && <PerformancePanel accessToken={accessToken} siteUrl={selection.siteUrl} />}
    </div>
  );
}

async function PerformancePanel({ accessToken, siteUrl }: { accessToken: string; siteUrl: string }) {
  let topQueries: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let topPages: Awaited<ReturnType<typeof querySearchAnalytics>> = [];
  let fetchError: string | null = null;

  try {
    const startDate = dateNDaysAgo(28);
    const endDate = dateNDaysAgo(0);
    [topQueries, topPages] = await Promise.all([
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
      querySearchAnalytics(accessToken, siteUrl, { startDate, endDate, dimensions: ['page'], rowLimit: 10 }),
    ]);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load Search Console performance data.';
  }

  if (fetchError) {
    return <p className="text-sm text-danger">{fetchError}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">Last 28 days — Source: Google Search Console API</p>
      <PerformanceTable title="Top queries" rows={topQueries} />
      <PerformanceTable title="Top pages" rows={topPages} />
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
