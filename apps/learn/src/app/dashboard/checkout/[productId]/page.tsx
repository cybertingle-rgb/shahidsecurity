import { notFound } from 'next/navigation';
import { getPurchasableProduct } from '@/lib/checkout';
import { getSetting } from '@/lib/settings';
import { submitPayment } from './actions';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

export default async function CheckoutProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const [resolved, instructions] = await Promise.all([getPurchasableProduct(productId), getSetting<string>('payment_instructions')]);
  if (!resolved) notFound();

  const { product, price } = resolved;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-lg text-neon">{formatAmount(price.amount, price.currencyCode)}</p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="font-medium">How to pay</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">
          {instructions ?? 'Bank transfer details have not been configured yet — contact support for payment instructions.'}
        </p>
      </div>

      <form action={submitPayment.bind(null, productId)} className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="font-medium">Submit your payment for verification</h2>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="transactionReference">
            Transaction reference / ID
          </label>
          <input id="transactionReference" name="transactionReference" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="amountClaimed">
            Amount transferred ({price.currencyCode})
          </label>
          <input
            id="amountClaimed"
            name="amountClaimed"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={(price.amount / 100).toFixed(2)}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="paymentDate">
            Date you paid
          </label>
          <input id="paymentDate" name="paymentDate" type="date" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="receiptFileUrl">
            Receipt/screenshot link (optional)
          </label>
          <input id="receiptFileUrl" name="receiptFileUrl" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" placeholder="https://..." />
        </div>
        <button type="submit" className="w-full rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Submit for verification
        </button>
        <p className="text-xs text-text-muted">
          An admin reviews every submission by hand before access is granted — this isn't instant, per our verification process.
        </p>
      </form>
    </div>
  );
}
