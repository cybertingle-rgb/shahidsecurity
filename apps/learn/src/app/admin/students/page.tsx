import Link from 'next/link';
import { listStudents } from '@/lib/admin/students';

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const search = params.q ?? '';
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const { rows, total } = await listStudents(search, page);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-sm text-text-muted">{total} total</p>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by name or email"
          className="w-full max-w-sm rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-border-strong px-4 py-2 text-sm">
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Roles</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/admin/students/${student.id}`} className="text-neon">
                    {student.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{student.email}</td>
                <td className="px-4 py-2 text-text-muted">{student.roleNames.join(', ') || '—'}</td>
                <td className="px-4 py-2">
                  <span className={student.status === 'suspended' ? 'text-danger' : 'text-neon-soft'}>{student.status}</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{student.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
