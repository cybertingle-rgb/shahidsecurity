import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { getPurchasableProduct } from '@/lib/checkout';
import { listActivePaymentMethods } from '@/lib/admin/paymentMethods';
import { localizeAmountForRequest } from '@/lib/currency';
import { submitPayment } from './actions';
import { enrollFree } from './free-enroll-action';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

export default async function CheckoutProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const [resolved, methods, requestHeaders] = await Promise.all([getPurchasableProduct(productId), listActivePaymentMethods(), headers()]);
  if (!resolved) notFound();

  const { product, price } = resolved;

  if (price.amount === 0) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-lg text-neon">Free</p>
        </div>
        <form action={enrollFree.bind(null, productId)}>
          <button type="submit" className="w-full rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Enroll for free
          </button>
        </form>
      </div>
    );
  }

  const localized = await localizeAmountForRequest(price.amount, requestHeaders);
  const showLocalized = localized.currencyCode !== price.currencyCode;

  // Generated from the wallet address itself, not an uploaded image — the
  // same QR always regenerates correctly if the admin ever edits the
  // instructions text, and there's nothing to re-upload if the address changes.
  const methodsWithQr = await Promise.all(
    methods.map(async (m) => ({
      ...m,
      qrDataUrl: m.type === 'crypto' && m.walletAddress ? await QRCode.toDataURL(m.walletAddress, { margin: 1, width: 180 }) : null,
    })),
  );

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-lg text-neon">
          {formatAmount(price.amount, price.currencyCode)}
          {showLocalized && <span className="ml-2 text-sm text-text-muted">≈ {formatAmount(localized.amount, localized.currencyCode)}</span>}
        </p>
      </div>

      {methodsWithQr.length === 0 && (
        <p className="rounded-lg border border-border p-4 text-sm text-text-muted">No payment methods are configured yet — contact support to pay.</p>
      )}

      {methodsWithQr.map((m) => (
        <div key={m.id} className="rounded-lg border border-border p-4">
          <h2 className="font-medium">{m.name}</h2>
          {m.instructions && <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{m.instructions}</p>}
          {m.walletAddress && (
            <div className="mt-3 flex items-start gap-4">
              {m.qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not an optimizable remote image
                <img src={m.qrDataUrl} alt={`${m.name} QR code`} width={140} height={140} className="rounded-md border border-border bg-white p-1" />
              )}
              <div>
                <p className="text-xs text-text-muted">Address</p>
                <p className="break-all font-mono text-sm text-text">{m.walletAddress}</p>
              </div>
            </div>
          )}

          <form action={submitPayment.bind(null, productId)} className="mt-4 space-y-3 border-t border-border pt-4">
            <input type="hidden" name="paymentMethodId" value={m.id} />
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`ref-${m.id}`}>
                Transaction reference / ID
              </label>
              <input id={`ref-${m.id}`} name="transactionReference" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`amt-${m.id}`}>
                Amount sent ({price.currencyCode})
              </label>
              <input
                id={`amt-${m.id}`}
                name="amountClaimed"
                type="number"
                step="0.00000001"
                min="0"
                required
                defaultValue={(price.amount / 100).toFixed(2)}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`date-${m.id}`}>
                Date you paid
              </label>
              <input id={`date-${m.id}`} name="paymentDate" type="date" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`receipt-${m.id}`}>
                Receipt/screenshot link (optional)
              </label>
              <input id={`receipt-${m.id}`} name="receiptFileUrl" placeholder="https://..." className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="w-full rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
              I paid with {m.name} — submit for verification
            </button>
          </form>
        </div>
      ))}

      <p className="text-xs text-text-muted">An admin reviews every submission by hand before access is granted — this isn't instant.</p>
    </div>
  );
}
