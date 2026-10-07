import Link from 'next/link';
import { listAllConnections, getValidAccessToken } from '@/lib/google/connections';
import { getAnalyticsSelection, getDailyVisitorCounts, type DailyVisitorCount } from '@/lib/google/analytics';
import { listUpcomingConsultations, countNewLeadsSince } from '@/lib/leads';
import { listInvoices } from '@/lib/payments';
import { listBlogPosts } from '@/lib/blog';

const VISITOR_DAYS = 7;

async function loadVisitors(): Promise<{ days: DailyVisitorCount[]; error: string | null }> {
  const connections = await listAllConnections();
  const analyticsConnection = connections.find((c) => c.scope === 'analytics');
  if (!analyticsConnection || analyticsConnection.status !== 'connected') {
    return { days: [], error: 'Analytics is not connected yet — see Google in the sidebar.' };
  }
  const selection = await getAnalyticsSelection(analyticsConnection.id);
  if (!selection?.propertyId) {
    return { days: [], error: 'No Analytics property selected yet — see Google in the sidebar.' };
  }
  const accessToken = await getValidAccessToken(analyticsConnection);
  if (!accessToken) {
    return { days: [], error: 'Analytics connection has no usable access token — reconnect it.' };
  }
  try {
    const days = await getDailyVisitorCounts(accessToken, selection.propertyId, VISITOR_DAYS);
    return { days, error: null };
  } catch (err) {
    return { days: [], error: err instanceof Error ? err.message : 'Failed to load visitor data.' };
  }
}

export default async function DashboardOverviewPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [visitors, upcomingBookings, newLeadsThisMonth, invoices, blogPosts] = await Promise.all([
    loadVisitors(),
    listUpcomingConsultations(8),
    countNewLeadsSince(startOfMonth),
    listInvoices(),
    listBlogPosts(),
  ]);

  const unpaidInvoices = invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue');
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amountDue), 0);
  const publishedPosts = blogPosts.filter((p) => p.status === 'published').length;

  const totalVisitors7d = visitors.days.reduce((sum, d) => sum + d.activeUsers, 0);
  const maxVisitorsInDay = Math.max(1, ...visitors.days.map((d) => d.activeUsers));

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="New leads this month" value={String(newLeadsThisMonth)} href="/dashboard/leads" />
        <StatTile
          label="Invoices awaiting payment"
          value={`${unpaidInvoices.length} ($${unpaidTotal.toFixed(2)})`}
          href="/dashboard/payments"
        />
        <StatTile label="Published blog posts" value={String(publishedPosts)} href="/dashboard/content/blog" />
      </div>

      <section className="space-y-3">
        <h2 className="font-medium text-text-muted">Visitors — last {VISITOR_DAYS} days</h2>
        <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
          {visitors.error ? (
            <p className="text-sm text-text-muted">{visitors.error}</p>
          ) : visitors.days.length === 0 ? (
            <p className="text-sm text-text-muted">No visitor data yet for this period.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-text-muted">
                <span className="text-lg font-semibold text-text">{totalVisitors7d}</span> active users total — real data from
                Google Analytics.
              </p>
              <div className="flex items-end gap-2" style={{ height: 80 }}>
                {visitors.days.map((d) => (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.activeUsers}`}>
                    <div
                      className="w-full rounded-t bg-neon"
                      style={{ height: `${Math.max(4, (d.activeUsers / maxVisitorsInDay) * 64)}px` }}
                    />
                    <span className="text-[10px] text-text-muted">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-text-muted">Upcoming bookings</h2>
          <Link href="/dashboard/leads/consultations" className="text-sm text-neon underline">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-muted">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {upcomingBookings.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-2">{b.fullName}</td>
                  <td className="px-4 py-2 text-text-muted">{b.requestedAt.toLocaleString()}</td>
                  <td className="px-4 py-2 text-text-muted">{b.status}</td>
                  <td className="px-4 py-2 text-text-muted">{b.email ?? b.phone ?? '—'}</td>
                </tr>
              ))}
              {upcomingBookings.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                    No upcoming bookings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Link href="/dashboard/configurations" className="inline-block text-sm text-neon underline">
        View integration health &amp; configurations
      </Link>
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="block rounded-lg border border-border bg-bg-elevated/60 p-4 hover:border-neon">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </Link>
  );
}
