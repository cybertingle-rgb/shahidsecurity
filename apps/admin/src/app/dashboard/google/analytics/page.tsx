import Link from 'next/link';
import { getConnectionForScope, getValidAccessToken, recordSuccessfulSync, classifyGoogleApiError } from '@/lib/google/connections';
import { listAccessibleProperties, runAnalyticsReport, getAnalyticsSelection, type AnalyticsProperty } from '@/lib/google/analytics';
import { selectAnalyticsProperty, verifyAnalyticsConnection } from './actions';

function dateNDaysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const ALLOWED_DAY_RANGES = [7, 28, 90] as const;
type DayRange = (typeof ALLOWED_DAY_RANGES)[number];

function parseDayRange(value: string | undefined): DayRange {
  const n = Number(value);
  return (ALLOWED_DAY_RANGES as readonly number[]).includes(n) ? (n as DayRange) : 28;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ change?: string; days?: string }> }) {
  const { change, days } = await searchParams;
  const dayRange = parseDayRange(days);
  const connection = await getConnectionForScope('analytics');

  if (!connection || connection.status !== 'connected') {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-text-muted">
          Not connected yet. <Link href="/dashboard/google" className="text-neon underline">Connect Google Analytics</Link> first.
        </p>
      </div>
    );
  }

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-danger">No usable access token for this connection. Reconnect from the Google integrations page.</p>
      </div>
    );
  }

  const selection = await getAnalyticsSelection(connection.id);
  const showPicker = change === '1' || !selection;

  let properties: AnalyticsProperty[] = [];
  let listError: string | null = null;
  if (showPicker) {
    try {
      properties = await listAccessibleProperties(accessToken);
    } catch (err) {
      listError = classifyGoogleApiError(err).message;
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Analytics</h1>

      {showPicker ? (
        <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
          <p className="text-sm text-text-muted">
            Select which GA4 property this Google account can access. Nothing is saved until the selection is tested
            against a real report query.
          </p>
          {listError && <p className="text-sm text-danger">{listError}</p>}
          {!listError && properties.length === 0 && (
            <p className="text-sm text-warn">No accessible Google Analytics properties found for this Google account.</p>
          )}
          {properties.length > 0 && (
            <form action={selectAnalyticsProperty} className="space-y-3">
              <div className="space-y-2">
                {properties.map((prop) => (
                  <label key={prop.propertyId} className="flex items-center gap-2 text-sm">
                    <input type="radio" name="propertyId" value={prop.propertyId} required defaultChecked={prop.propertyId === selection?.propertyId} />
                    <span>{prop.propertyName}</span>
                    <span className="text-xs text-text-muted">
                      ({prop.accountName} — {prop.propertyId})
                    </span>
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
            <div className="text-sm">
              <p>
                Selected property: <span className="font-medium">{selection.propertyName}</span>{' '}
                <span className="text-xs text-text-muted">({selection.propertyId})</span>
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Timezone: {selection.timezone} · Currency: {selection.currency}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={verifyAnalyticsConnection}>
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                  Test connection
                </button>
              </form>
              <Link href="/dashboard/google/analytics?change=1" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                Change property
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Last synced: {connection.lastSyncedAt ? connection.lastSyncedAt.toLocaleString() : 'never — no successful data read yet'}.
          </p>
        </div>
      )}

      {selection?.propertyId && !showPicker && (
        <>
          <div className="flex gap-2 text-xs">
            {ALLOWED_DAY_RANGES.map((d) => (
              <Link
                key={d}
                href={`/dashboard/google/analytics?days=${d}`}
                className={`rounded-md border px-2.5 py-1 ${d === dayRange ? 'border-neon text-neon' : 'border-border text-text-muted'}`}
              >
                Last {d} days
              </Link>
            ))}
          </div>
          <AnalyticsPanel accessToken={accessToken} propertyId={selection.propertyId} connectionId={connection.id} days={dayRange} />
        </>
      )}
    </div>
  );
}

async function AnalyticsPanel({
  accessToken,
  propertyId,
  connectionId,
  days,
}: {
  accessToken: string;
  propertyId: string;
  connectionId: string;
  days: DayRange;
}) {
  let topPages: Awaited<ReturnType<typeof runAnalyticsReport>> = [];
  let acquisition: Awaited<ReturnType<typeof runAnalyticsReport>> = [];
  let fetchError: ReturnType<typeof classifyGoogleApiError> | null = null;

  try {
    const startDate = dateNDaysAgo(days);
    const endDate = dateNDaysAgo(0);
    [topPages, acquisition] = await Promise.all([
      runAnalyticsReport(accessToken, propertyId, {
        startDate,
        endDate,
        dimensions: ['pagePath'],
        metrics: ['screenPageViews', 'activeUsers'],
        limit: 10,
      }),
      // Traffic acquisition: which channel sessions actually arrived
      // through — distinct from pagePath (what they looked at once there).
      runAnalyticsReport(accessToken, propertyId, {
        startDate,
        endDate,
        dimensions: ['sessionDefaultChannelGroup'],
        metrics: ['sessions', 'activeUsers', 'engagementRate'],
        limit: 10,
      }),
    ]);
    await recordSuccessfulSync(connectionId, 'analytics_report');
  } catch (err) {
    fetchError = classifyGoogleApiError(err);
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/5 p-4">
        <p className="text-sm text-danger">{fetchError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">Last {days} days — Source: Google Analytics Data API</p>

      <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
        <h2 className="mb-1 font-medium">Top pages</h2>
        {topPages.length === 0 ? (
          <p className="text-sm text-text-muted">No data for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-1">Page</th>
                <th className="pb-1">Page views</th>
                <th className="pb-1">Active users</th>
              </tr>
            </thead>
            <tbody>
              {topPages.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1">{row.dimensionValues[0]}</td>
                  <td className="py-1">{row.metricValues[0]}</td>
                  <td className="py-1">{row.metricValues[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
        <h2 className="mb-1 font-medium">Traffic acquisition</h2>
        <p className="mb-2 text-xs text-text-muted">Which channel sessions actually arrived through.</p>
        {acquisition.length === 0 ? (
          <p className="text-sm text-text-muted">No data for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="pb-1">Channel</th>
                <th className="pb-1">Sessions</th>
                <th className="pb-1">Active users</th>
                <th className="pb-1">Engagement rate</th>
              </tr>
            </thead>
            <tbody>
              {acquisition.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="py-1">{row.dimensionValues[0]}</td>
                  <td className="py-1">{row.metricValues[0]}</td>
                  <td className="py-1">{row.metricValues[1]}</td>
                  <td className="py-1">{((row.metricValues[2] ?? 0) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
