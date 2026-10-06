import Link from 'next/link';
import { listAllConnections, getLatestError } from '@/lib/google/connections';
import { getCachedBusinessProfile } from '@/lib/google/businessProfile';
import { getSearchConsoleSelection } from '@/lib/google/searchConsole';
import { getAnalyticsSelection } from '@/lib/google/analytics';
import { googleOAuthConfigured, type GoogleScopeName } from '@/lib/google/oauth';
import { disconnectGoogleScope } from './actions';

const SCOPES: Array<{ key: GoogleScopeName; label: string; description: string }> = [
  { key: 'business_profile', label: 'Google Business Profile', description: 'Reads the connected location’s real name, address, and review count/rating as Google reports them.' },
  { key: 'analytics', label: 'Google Analytics', description: 'Read-only access to the connected property’s traffic data.' },
  { key: 'search_console', label: 'Google Search Console', description: 'Read-only access to the connected site’s search performance data.' },
];

export default async function GoogleIntegrationsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const { connected, error } = await searchParams;
  const connections = await listAllConnections();
  const connectionByScope = new Map(connections.map((c) => [c.scope, c]));
  const businessProfileConnection = connectionByScope.get('business_profile');
  const cachedProfile = businessProfileConnection?.status === 'connected' ? await getCachedBusinessProfile(businessProfileConnection.id) : null;
  const searchConsoleConnection = connectionByScope.get('search_console');
  const searchConsoleSelection = searchConsoleConnection?.status === 'connected' ? await getSearchConsoleSelection(searchConsoleConnection.id) : null;
  const analyticsConnection = connectionByScope.get('analytics');
  const analyticsSelection = analyticsConnection?.status === 'connected' ? await getAnalyticsSelection(analyticsConnection.id) : null;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Google integrations</h1>

      {connected && <p className="rounded-lg border border-neon/40 bg-neon-dim p-3 text-sm text-neon">Connected successfully.</p>}
      {error && <p className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">Connection failed: {error}</p>}

      {!googleOAuthConfigured && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 p-4 text-sm text-text-muted">
          <strong className="text-warn">Not configured.</strong> Set <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and{' '}
          <code>GOOGLE_REDIRECT_URI</code> (and <code>TOKEN_ENCRYPTION_KEY</code>) before any of these can be connected — see{' '}
          <code>docs/GOOGLE_INTEGRATION_SETUP.md</code>. Every &ldquo;Connect&rdquo; button below is disabled until then.
        </div>
      )}

      <div className="space-y-3">
        {SCOPES.map((s) => {
          const conn = connectionByScope.get(s.key);
          const isConnected = conn?.status === 'connected';
          const disconnect = disconnectGoogleScope.bind(null, s.key);

          return (
            <div key={s.key} className="rounded-lg border border-border bg-bg-elevated/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-text-muted">{s.description}</p>
                </div>
                {isConnected ? (
                  <form action={disconnect}>
                    <button type="submit" className="rounded-md border border-danger px-3 py-1.5 text-xs text-danger">
                      Disconnect
                    </button>
                  </form>
                ) : (
                  <a
                    href={googleOAuthConfigured ? `/api/google/connect/${s.key}` : undefined}
                    aria-disabled={!googleOAuthConfigured}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${googleOAuthConfigured ? 'bg-neon text-bg' : 'cursor-not-allowed bg-border text-text-muted'}`}
                  >
                    Connect
                  </a>
                )}
              </div>
              {isConnected && (
                <p className="mt-2 text-xs text-text-muted">
                  Connected, Google account: {conn.googleAccountEmail ?? 'unknown'}. Last synced: {conn.lastSyncedAt ? conn.lastSyncedAt.toLocaleString() : 'never'}.
                </p>
              )}
              {isConnected && <LastError connectionId={conn.id} /> }
              {isConnected && s.key === 'business_profile' && (
                <div className="mt-3 border-t border-border pt-3 text-xs text-text-muted">
                  {cachedProfile?.googleLocationId ? (
                    <p>Selected location: {cachedProfile.locationName ?? cachedProfile.googleLocationId}</p>
                  ) : (
                    <p>No location selected yet.</p>
                  )}
                  <Link href="/dashboard/google/business-profile" className="mt-1 inline-block text-neon underline">
                    {cachedProfile?.googleLocationId ? 'Manage / change location' : 'Select an account and location'}
                  </Link>
                </div>
              )}
              {isConnected && s.key === 'search_console' && (
                <div className="mt-3 border-t border-border pt-3 text-xs text-text-muted">
                  {searchConsoleSelection ? (
                    <p>Selected property: {searchConsoleSelection.siteUrl}</p>
                  ) : (
                    <p>No property selected yet.</p>
                  )}
                  <Link href="/dashboard/google/search-console" className="mt-1 inline-block text-neon underline">
                    {searchConsoleSelection ? 'View performance / change property' : 'Select a property'}
                  </Link>
                </div>
              )}
              {isConnected && s.key === 'analytics' && (
                <div className="mt-3 border-t border-border pt-3 text-xs text-text-muted">
                  {analyticsSelection ? (
                    <p>Selected property: {analyticsSelection.propertyName} ({analyticsSelection.propertyId})</p>
                  ) : (
                    <p>No property selected yet.</p>
                  )}
                  <Link href="/dashboard/google/analytics" className="mt-1 inline-block text-neon underline">
                    {analyticsSelection ? 'View data / change property' : 'Select a property'}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function LastError({ connectionId }: { connectionId: string }) {
  const latestError = await getLatestError(connectionId);
  if (!latestError) return null;
  return (
    <p className="mt-1 text-xs text-danger">
      Last error ({latestError.createdAt.toLocaleString()}): {latestError.errorMessage ?? 'unknown error'}
    </p>
  );
}
