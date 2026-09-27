import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getContinueLearning, getMyEnrollments } from '@/lib/student/data';

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const [continueLearning, enrollments] = await Promise.all([getContinueLearning(session.id), getMyEnrollments(session.id)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Learning</h1>

      {continueLearning ? (
        <div className="rounded-lg border border-neon/40 bg-neon-dim p-4">
          <p className="text-sm text-text-muted">Continue learning</p>
          <p className="mt-1 text-lg font-medium">{continueLearning.courseTitle}</p>
          <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-bg-elevated">
            <div className="h-full bg-neon" style={{ width: `${continueLearning.percentComplete}%` }} />
          </div>
          <p className="mt-1 text-sm text-text-muted">{continueLearning.percentComplete}% complete</p>
        </div>
      ) : enrollments.length === 0 ? (
        <p className="text-text-muted">
          You're not enrolled in anything yet. Browse the catalog at{' '}
          <Link href="https://shahidiqbal.com/learn/courses" className="text-neon">
            shahidiqbal.com/learn/courses
          </Link>
          .
        </p>
      ) : (
        <p className="text-text-muted">All caught up — every enrolled course is complete.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/dashboard/courses" className="rounded-lg border border-border p-4 hover:border-border-strong hover:bg-surface">
          <p className="text-2xl font-semibold">{enrollments.length}</p>
          <p className="text-sm text-text-muted">Active enrollment{enrollments.length === 1 ? '' : 's'}</p>
        </Link>
        <Link href="/dashboard/membership" className="rounded-lg border border-border p-4 hover:border-border-strong hover:bg-surface">
          <p className="text-sm text-text-muted">Membership</p>
        </Link>
        <Link href="/dashboard/community" className="rounded-lg border border-border p-4 hover:border-border-strong hover:bg-surface">
          <p className="text-sm text-text-muted">Community</p>
        </Link>
        <Link href="/dashboard/orders" className="rounded-lg border border-border p-4 hover:border-border-strong hover:bg-surface">
          <p className="text-sm text-text-muted">Orders</p>
        </Link>
      </div>
    </div>
  );
}
