import { listExchangeRatesAdmin } from '@/lib/learn/exchangeRates';
import ConfirmSubmitButton from '../_components/ConfirmSubmitButton';
import { setExchangeRate, deleteExchangeRate } from './actions';

export default async function LearnExchangeRatesPage() {
  const rates = await listExchangeRatesAdmin();

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Exchange rates</h1>
        <p className="text-sm text-text-muted">
          Every product price is set in USD (Products &amp; Pricing). These rates control what a visitor in another currency sees — set today's rate and
          it stays exactly that, unchanged, until you update it here. No live rate feed, nothing auto-updates in the background.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2">1 USD =</th>
              <th className="px-4 py-2">Last updated</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{r.currencyCode}</td>
                <td className="px-4 py-2">{r.rate}</td>
                <td className="px-4 py-2 text-text-muted">{r.updatedAt.toLocaleString()}</td>
                <td className="px-4 py-2">
                  <form action={deleteExchangeRate.bind(null, r.id)}>
                    <ConfirmSubmitButton
                      confirmMessage={`Remove the ${r.currencyCode} exchange rate? Visitors in that currency will see USD prices until a new rate is set.`}
                      className="text-xs text-danger"
                    >
                      Remove
                    </ConfirmSubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-text-muted">
                  No rates set yet — every visitor sees USD until you add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={setExchangeRate} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted">Currency (ISO 4217)</label>
          <input name="currencyCode" placeholder="PKR" maxLength={3} required className="w-24 rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">1 USD = how many?</label>
          <input name="rate" type="number" step="0.000001" min="0.000001" placeholder="285.50" required className="w-36 rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Set rate
        </button>
      </form>
    </div>
  );
}
