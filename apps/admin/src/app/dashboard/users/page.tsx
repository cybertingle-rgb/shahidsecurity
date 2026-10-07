import Link from 'next/link';
import { listAdminUsers } from '@/lib/adminUsers';

export default async function UsersPage() {
  const users = await listAdminUsers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Link href="/dashboard/users/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New admin
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last login</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/users/${u.id}`} className="text-neon">
                    {u.fullName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{u.email}</td>
                <td className="px-4 py-2 text-text-muted">{u.roles.join(', ') || 'No role'}</td>
                <td className="px-4 py-2">
                  <span className={u.status === 'active' ? 'text-neon-soft' : 'text-danger'}>{u.status}</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{u.lastLoginAt ? u.lastLoginAt.toLocaleString() : 'Never'}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No admin accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
