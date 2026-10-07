import { notFound } from 'next/navigation';
import { getAdminUserById, listRoles } from '@/lib/adminUsers';
import { updateAdminUserProfile, setAdminUserRole, setAdminUserStatus } from '../actions';

export default async function EditAdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, roles] = await Promise.all([getAdminUserById(id), listRoles()]);
  if (!user) notFound();

  const boundUpdateProfile = updateAdminUserProfile.bind(null, id);
  const suspend = setAdminUserStatus.bind(null, id, 'suspended');
  const reactivate = setAdminUserStatus.bind(null, id, 'active');
  const currentRoleId = roles.find((r) => user.roles.includes(r.name))?.id ?? '';

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{user.fullName}</h1>
        <span className={user.status === 'active' ? 'text-sm text-neon-soft' : 'text-sm text-danger'}>{user.status}</span>
      </div>

      <form action={boundUpdateProfile} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <h2 className="text-sm font-medium text-text-muted">Profile</h2>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            defaultValue={user.fullName}
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
            defaultValue={user.email}
            required
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save profile
        </button>
      </form>

      <form
        action={async (formData: FormData) => {
          'use server';
          await setAdminUserRole(id, String(formData.get('roleId') ?? ''));
        }}
        className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6"
      >
        <h2 className="text-sm font-medium text-text-muted">Role</h2>
        <select
          name="roleId"
          defaultValue={currentRoleId}
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
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save role
        </button>
      </form>

      <div className="rounded-lg border border-border bg-bg-elevated/60 p-6">
        <h2 className="mb-4 text-sm font-medium text-text-muted">Account access</h2>
        {user.status === 'active' ? (
          <form action={suspend}>
            <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
              Suspend account
            </button>
          </form>
        ) : (
          <form action={reactivate}>
            <button type="submit" className="rounded-md border border-neon px-4 py-2 text-sm text-neon">
              Reactivate account
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-text-muted">
          Suspending signs them out everywhere immediately. There&apos;s no &quot;set password for them&quot; action here by
          design — ask them to use &quot;Forgot password?&quot; on the login page instead.
        </p>
      </div>
    </div>
  );
}
