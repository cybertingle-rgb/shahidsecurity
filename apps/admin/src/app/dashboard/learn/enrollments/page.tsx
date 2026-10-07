import Link from 'next/link';
import { listEnrollments } from '@/lib/learn/enrollments';
import ConfirmSubmitButton from '../_components/ConfirmSubmitButton';
import { revokeEnrollment } from '../students/actions';

export default async function LearnEnrollmentsPage() {
  const enrollments = await listEnrollments();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Enrollments</h1>
      <p className="text-sm text-text-muted">
        Most recent 100. To grant a new enrollment, open the student's profile and use "Grant manual enrollment" there.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Course / Product</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Enrolled</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {enrollments.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/learn/students/${e.studentId}`} className="text-neon">
                    {e.studentName}
                  </Link>
                  <div className="text-xs text-text-muted">{e.studentEmail}</div>
                </td>
                <td className="px-4 py-2">{e.courseTitle ?? e.productName ?? '—'}</td>
                <td className="px-4 py-2 text-text-muted">{e.source}</td>
                <td className="px-4 py-2">{e.status}</td>
                <td className="px-4 py-2 text-text-muted">{e.enrolledAt.toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  {e.status === 'active' && (
                    <form action={revokeEnrollment.bind(null, e.id, e.studentId)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Revoke ${e.studentName}'s access to "${e.courseTitle ?? e.productName}"? They will lose access immediately.`}
                        className="text-sm text-danger"
                      >
                        Revoke
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {enrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  No enrollments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
