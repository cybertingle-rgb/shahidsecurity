import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getMyEnrollments } from '@/lib/student/data';

export default async function MyCoursesPage() {
  const session = await getSessionUser();
  const enrollments = session ? await getMyEnrollments(session.id) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Courses</h1>

      {enrollments.length === 0 && (
        <p className="text-text-muted">
          No active courses yet. Browse the catalog at{' '}
          <Link href="https://shahidiqbal.com/learn/courses" className="text-neon">
            shahidiqbal.com/learn/courses
          </Link>
          .
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {enrollments.map((e) => (
          <div key={e.enrollmentId} className="rounded-lg border border-border p-4">
            <p className="font-medium">{e.courseTitle ?? e.productName ?? 'Membership'}</p>
            {e.courseId && (
              <>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                  <div className="h-full bg-neon" style={{ width: `${e.percentComplete ?? 0}%` }} />
                </div>
                <p className="mt-1 text-sm text-text-muted">{e.percentComplete ?? 0}% complete</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
