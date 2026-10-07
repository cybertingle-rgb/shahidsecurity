import Link from 'next/link';
import { listPaymentMethods } from '@/lib/paymentMethods';
import { createManualPaymentMethod, updateManualPaymentMethod, setManualPaymentMethodStatus, deleteManualPaymentMethod } from './actions';

const TYPES = ['bank_transfer', 'crypto', 'mobile_wallet', 'other'] as const;
const TYPE_LABEL: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  crypto: 'Crypto wallet',
  mobile_wallet: 'Mobile wallet (JazzCash, EasyPaisa, ...)',
  other: 'Other',
};

export default async function PaymentMethodsPage() {
  const methods = await listPaymentMethods();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/payments" className="text-sm text-neon underline">
          ← Back to payments
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Payment methods</h1>
        <p className="text-sm text-text-muted">
          Bank/crypto/wallet options staff can give a client when recording a manual payment. Only active ones are relevant
          — the ones below are reference info for your own team, not shown publicly on shahidiqbal.com.
        </p>
      </div>

      <div className="space-y-3">
        {methods.map((m) => (
          <details key={m.id} className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">
              {m.name} <span className="text-xs text-text-muted">({TYPE_LABEL[m.type]})</span>{' '}
              {!m.isActive && <span className="text-xs text-danger">inactive</span>}
            </summary>
            <form action={updateManualPaymentMethod.bind(null, m.id)} className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-text-muted">Name</label>
                <input name="name" defaultValue={m.name} required className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-text-muted">Type</label>
                <select name="type" defaultValue={m.type} className="rounded-md border border-border bg-bg px-2 py-1 text-sm">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted">Wallet address (crypto/mobile wallet only)</label>
                <input
                  name="walletAddress"
                  defaultValue={m.walletAddress ?? ''}
                  placeholder="bc1p... / 03xxxxxxxxx"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted">Instructions / notes</label>
                <textarea
                  name="instructions"
                  defaultValue={m.instructions ?? ''}
                  rows={3}
                  placeholder="Bank name / account title / account number, or notes like 'BTC only, network fee is on the client'"
                  className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm"
                />
              </div>
              <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                Save
              </button>
            </form>
            <div className="mt-2 flex gap-3">
              <form action={setManualPaymentMethodStatus.bind(null, m.id, !m.isActive)}>
                <button type="submit" className="text-xs text-neon">
                  {m.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </form>
              <form action={deleteManualPaymentMethod.bind(null, m.id)}>
                <button type="submit" className="text-xs text-danger">
                  Delete
                </button>
              </form>
            </div>
          </details>
        ))}
        {methods.length === 0 && <p className="text-sm text-text-muted">No payment methods yet — add one below.</p>}
      </div>

      <form action={createManualPaymentMethod} className="space-y-3 rounded-lg border border-dashed border-border-strong p-4">
        <h2 className="font-medium">Add a payment method</h2>
        <div>
          <label className="block text-xs text-text-muted">Name</label>
          <input
            name="name"
            required
            placeholder="Bank Transfer / Bitcoin (BTC) / JazzCash"
            className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Type</label>
          <select name="type" className="rounded-md border border-border bg-bg px-2 py-1 text-sm">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted">Wallet address (crypto/mobile wallet only)</label>
          <input name="walletAddress" placeholder="bc1p... / 03xxxxxxxxx" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Instructions / notes</label>
          <textarea name="instructions" rows={3} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add method
        </button>
      </form>
    </div>
  );
}
