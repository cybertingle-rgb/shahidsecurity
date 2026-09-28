import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getMyMembership } from '@/lib/student/data';

export default async function MembershipPage() {
  const session = await getSessionUser();
  const membership = session ? await getMyMembership(session.id) : null;

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Membership</h1>

      {membership ? (
        <div className="rounded-lg border border-border p-4">
          <p className="font-medium">{membership.productName}</p>
          <p className="mt-1 text-sm text-text-muted">
            Status: <span className={membership.status === 'active' ? 'text-neon-soft' : 'text-danger'}>{membership.status}</span>
          </p>
          <p className="text-sm text-text-muted">Started: {membership.startedAt.toLocaleDateString()}</p>
          {membership.expiresAt && <p className="text-sm text-text-muted">Expires: {membership.expiresAt.toLocaleDateString()}</p>}
          {!membership.expiresAt && <p className="text-sm text-text-muted">No expiry — this membership doesn't lapse.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-text-muted">You don't have an active membership yet.</p>
          <Link href="/dashboard/checkout" className="inline-block rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Browse membership & courses
          </Link>
        </div>
      )}
    </div>
  );
}
