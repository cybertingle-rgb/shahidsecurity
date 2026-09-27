import { changePassword } from './actions';

export default function SettingsPage() {
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <form action={changePassword} className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="currentPassword">
            Current password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="newPassword">
            New password (min. 10 characters)
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={10}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <p className="text-xs text-text-muted">Changing your password signs you out everywhere, including this device — you'll need to log in again.</p>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Change password
        </button>
      </form>
    </div>
  );
}
