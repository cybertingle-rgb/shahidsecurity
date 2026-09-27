import { getSessionUser } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Learning</h1>
      <p className="text-text-muted">
        Signed in as {user?.email}. This is the Phase 2 auth/RBAC skeleton — My Courses, Progress, Membership, Community,
        Orders, Certificates, Profile, and Settings (docs/lms-student-guide.md) ship in Phases 3–9.
      </p>
    </div>
  );
}
