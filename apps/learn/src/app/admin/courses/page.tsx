import Link from 'next/link';
import { listCourses } from '@/lib/admin/courses';

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-text-muted',
  review: 'text-warn',
  published: 'text-neon-soft',
  archived: 'text-danger',
};

export default async function CoursesPage() {
  const courses = await listCourses();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <Link href="/admin/courses/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New course
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Instructor</th>
              <th className="px-4 py-2">Level</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/admin/courses/${c.id}`} className="text-neon">
                    {c.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{c.instructorName ?? '—'}</td>
                <td className="px-4 py-2 text-text-muted">{c.level}</td>
                <td className="px-4 py-2">
                  <span className={STATUS_COLOR[c.status]}>{c.status}</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{c.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No courses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
