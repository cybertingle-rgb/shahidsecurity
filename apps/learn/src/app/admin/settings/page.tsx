import Link from 'next/link';
import { getSetting } from '@/lib/settings';
import { updateSettings } from './actions';

export default async function AdminSettingsPage() {
  const supportEmail = await getSetting<string>('support_email');

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <p className="rounded-lg border border-border p-4 text-sm text-text-muted">
        Bank transfer, crypto, and other payment instructions now live under{' '}
        <Link href="/admin/payment-methods" className="text-neon">
          Payment Methods
        </Link>{' '}
        — you can add as many as you want there.
      </p>

      <form action={updateSettings} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="supportEmail">
            Support email
          </label>
          <input id="supportEmail" name="supportEmail" type="email" defaultValue={supportEmail ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>
    </div>
  );
}
