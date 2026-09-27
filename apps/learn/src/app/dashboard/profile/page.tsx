import { getSessionUser } from '@/lib/auth/session';
import { getMyProfile } from '@/lib/student/data';
import { updateMyProfile } from './actions';

export default async function ProfilePage() {
  const session = await getSessionUser();
  const profile = session ? await getMyProfile(session.id) : null;
  if (!profile) return null;

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <form action={updateMyProfile} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted">Email</label>
          <input value={profile.email} disabled className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text-muted" />
          <p className="mt-1 text-xs text-text-muted">Email changes aren't self-service yet — contact support.</p>
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="fullName">
            Full name
          </label>
          <input id="fullName" name="fullName" defaultValue={profile.fullName} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="username">
            Username (optional)
          </label>
          <input id="username" name="username" defaultValue={profile.username ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="phone">
            Phone (optional)
          </label>
          <input id="phone" name="phone" defaultValue={profile.phone ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="countryCode">
            Country (ISO 3166-1 alpha-2, e.g. PK)
          </label>
          <input
            id="countryCode"
            name="countryCode"
            maxLength={2}
            defaultValue={profile.countryCode ?? ''}
            className="w-24 rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save changes
        </button>
      </form>
    </div>
  );
}
