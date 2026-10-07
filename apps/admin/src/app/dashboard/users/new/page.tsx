import { listRoles } from '@/lib/adminUsers';
import { createAdminUser } from '../actions';

export default async function NewAdminUserPage() {
  const roles = await listRoles();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">New admin account</h1>

      <form action={createAdminUser} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="password">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            minLength={12}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
          />
          <p className="text-xs text-text-muted">At least 12 characters. Share it with them separately — they should change it via &quot;Forgot password?&quot; right after logging in.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="roleId">
            Role
          </label>
          <select
            id="roleId"
            name="roleId"
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
          >
            <option value="">Select a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="w-full rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create account
        </button>
      </form>
    </div>
  );
}
