import { getSetting } from '@/lib/settings';
import { updateSettings } from './actions';

export default async function AdminSettingsPage() {
  const [paymentInstructions, supportEmail] = await Promise.all([
    getSetting<string>('payment_instructions'),
    getSetting<string>('support_email'),
  ]);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <form action={updateSettings} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="paymentInstructions">
            Bank transfer instructions (shown to students at checkout)
          </label>
          <textarea
            id="paymentInstructions"
            name="paymentInstructions"
            rows={6}
            defaultValue={paymentInstructions ?? ''}
            placeholder="Bank: ...&#10;Account title: ...&#10;Account number / IBAN: ...&#10;Then submit your transaction reference on this page."
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
          />
        </div>
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
