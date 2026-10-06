import Link from 'next/link';
import { listAllConnections } from '@/lib/google/connections';
import { getSearchConsoleSelection } from '@/lib/google/searchConsole';
import { getAnalyticsSelection } from '@/lib/google/analytics';
import { getCachedBusinessProfile } from '@/lib/google/businessProfile';
import { getLatestPublication } from '@/lib/publish/publications';
import { isGitHubPublishConfigured } from '@/lib/github/client';
import { googleOAuthConfigured } from '@/lib/google/oauth';

const SITE_HEALTH_CHECK_URL = 'https://shahidiqbal.com/';
const SITE_HEALTH_CHECK_TIMEOUT_MS = 4000;

type HealthStatus = 'ok' | 'error' | 'needs_configuration' | 'unknown';

function StatusBadge({ status, label }: { status: HealthStatus; label: string }) {
  const styles: Record<HealthStatus, string> = {
    ok: 'bg-neon-dim text-neon border-neon/40',
    error: 'bg-danger/10 text-danger border-danger/40',
    needs_configuration: 'bg-warn/10 text-warn border-warn/40',
    unknown: 'bg-border/40 text-text-muted border-border',
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{label}</span>;
}

/** A real, best-effort outbound check — never assumed, and a fetch failure shows "unknown" rather than a false "online" or "offline". */
async function checkWebsiteHealth(): Promise<{ status: HealthStatus; detail: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SITE_HEALTH_CHECK_TIMEOUT_MS);
    const res = await fetch(SITE_HEALTH_CHECK_URL, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return res.ok ? { status: 'ok', detail: `HTTP ${res.status}` } : { status: 'error', detail: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'unknown', detail: err instanceof Error ? err.message : 'Request failed' };
  }
}

export default async function DashboardHomePage() {
  const [websiteHealth, connections, latestPublication] = await Promise.all([
    checkWebsiteHealth(),
    listAllConnections(),
    getLatestPublication(),
  ]);

  const connectionByScope = new Map(connections.map((c) => [c.scope, c]));
  const businessProfileConnection = connectionByScope.get('business_profile');
  const searchConsoleConnection = connectionByScope.get('search_console');
  const analyticsConnection = connectionByScope.get('analytics');

  const businessProfileSelected = businessProfileConnection?.status === 'connected' ? await getCachedBusinessProfile(businessProfileConnection.id) : null;
  const searchConsoleSelected = searchConsoleConnection?.status === 'connected' ? await getSearchConsoleSelection(searchConsoleConnection.id) : null;
  const analyticsSelected = analyticsConnection?.status === 'connected' ? await getAnalyticsSelection(analyticsConnection.id) : null;

  const publishConfigured = isGitHubPublishConfigured();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-text-muted">
        Real integration health — nothing here is a placeholder green light. A status reads
        &ldquo;Needs configuration&rdquo; or &ldquo;Unknown&rdquo; rather than a false &ldquo;OK&rdquo; when something hasn&apos;t
        been set up or a live check couldn&apos;t run.
      </p>

      <section className="space-y-3">
        <h2 className="font-medium text-text-muted">Website &amp; publishing</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <HealthCard
            title="Public website (shahidiqbal.com)"
            status={websiteHealth.status}
            detail={websiteHealth.status === 'unknown' ? `Live check failed: ${websiteHealth.detail}` : websiteHealth.detail}
          />
          <HealthCard
            title="Admin panel"
            status="ok"
            detail="Online (you're viewing it)"
          />
          <HealthCard
            title="Publish-to-website pipeline"
            status={publishConfigured ? 'ok' : 'needs_configuration'}
            detail={publishConfigured ? 'GitHub credential configured' : 'GITHUB_TOKEN not set — see docs/CONTENT_PUBLISHING.md'}
          />
          <HealthCard
            title="Last content publish"
            status={!latestPublication ? 'unknown' : latestPublication.status === 'published' ? 'ok' : latestPublication.status === 'failed' ? 'error' : 'unknown'}
            detail={
              !latestPublication
                ? 'Nothing published to the live site yet'
                : `${latestPublication.targetSlugOrPath} — ${latestPublication.status} (${latestPublication.createdAt.toLocaleString()})`
            }
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-text-muted">Google integrations</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <HealthCard
            title="Search Console"
            status={!googleOAuthConfigured ? 'needs_configuration' : searchConsoleSelected?.siteUrl ? 'ok' : 'needs_configuration'}
            detail={searchConsoleSelected?.siteUrl ? `Property: ${searchConsoleSelected.siteUrl}` : 'Not connected or no property selected'}
          />
          <HealthCard
            title="Analytics"
            status={!googleOAuthConfigured ? 'needs_configuration' : analyticsSelected?.propertyId ? 'ok' : 'needs_configuration'}
            detail={analyticsSelected?.propertyId ? `Property: ${analyticsSelected.propertyName}` : 'Not connected or no property selected'}
          />
          <HealthCard
            title="Business Profile"
            status={!googleOAuthConfigured ? 'needs_configuration' : businessProfileSelected?.googleLocationId ? 'ok' : 'needs_configuration'}
            detail={
              businessProfileSelected?.googleLocationId
                ? `Location: ${businessProfileSelected.locationName ?? businessProfileSelected.googleLocationId}`
                : 'Not connected or no location selected — also blocked on Google Cloud approval, see docs/GOOGLE_BUSINESS_PROFILE.md'
            }
          />
        </div>
        <Link href="/dashboard/google" className="inline-block text-sm text-neon underline">
          Manage Google connections
        </Link>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-text-muted">Backups</h2>
        <HealthCard
          title="Database backups"
          status="needs_configuration"
          detail="No automated backup is configured for this database yet — set up Hostinger's own backup feature or a scheduled mysqldump job."
        />
      </section>
    </div>
  );
}

function HealthCard({ title, status, detail }: { title: string; status: HealthStatus; detail: string }) {
  const label: Record<HealthStatus, string> = { ok: 'OK', error: 'Error', needs_configuration: 'Needs configuration', unknown: 'Unknown' };
  return (
    <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <StatusBadge status={status} label={label[status]} />
      </div>
      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  );
}
