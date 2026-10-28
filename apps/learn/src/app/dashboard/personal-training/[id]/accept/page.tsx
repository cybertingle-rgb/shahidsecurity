import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getSessionUser } from '@/lib/auth/session';
import { getMyTrainingRequest } from '@/lib/personalTraining';
import { listActivePaymentMethods } from '@/lib/admin/paymentMethods';
import { localizeAmountForRequest } from '@/lib/currency';
import { headers } from 'next/headers';
import { acceptPersonalTrainingOffer } from './actions';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

export default async function AcceptPersonalTrainingOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;

  const request = await getMyTrainingRequest(user.id, id);
  if (!request) notFound();

  if (request.status !== 'approved' || request.agreedPriceAmount == null || !request.agreedCurrencyCode) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Personal Training</h1>
        <p className="text-sm text-text-muted">
          {request.convertedOrderId
            ? 'This offer has already been accepted.'
            : "This request doesn't have a price offer ready to accept yet — we'll let you know once it does."}
        </p>
      </div>
    );
  }

  const agreedPriceAmount = request.agreedPriceAmount;
  const agreedCurrencyCode = request.agreedCurrencyCode;

  const [methods, requestHeaders] = await Promise.all([listActivePaymentMethods(), headers()]);
  const localized = await localizeAmountForRequest(agreedPriceAmount, requestHeaders);
  const showLocalized = localized.currencyCode !== agreedCurrencyCode;

  const methodsWithQr = await Promise.all(
    methods.map(async (m) => ({
      ...m,
      qrDataUrl: m.type === 'crypto' && m.walletAddress ? await QRCode.toDataURL(m.walletAddress, { margin: 1, width: 180 }) : null,
    })),
  );

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Personal Training — {request.areaOfInterest}</h1>
        <p className="mt-1 text-lg text-neon">
          {formatAmount(agreedPriceAmount, agreedCurrencyCode)}
          {showLocalized && <span className="ml-2 text-sm text-text-muted">≈ {formatAmount(localized.amount, localized.currencyCode)}</span>}
        </p>
        <p className="mt-2 text-sm text-text-muted">This is the price agreed with you for this training. Pay with one of the methods below to confirm your booking.</p>
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

          <form action={acceptPersonalTrainingOffer.bind(null, request.id)} className="mt-4 space-y-3 border-t border-border pt-4">
            <input type="hidden" name="paymentMethodId" value={m.id} />
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`ref-${m.id}`}>
                Transaction reference / ID
              </label>
              <input id={`ref-${m.id}`} name="transactionReference" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted" htmlFor={`amt-${m.id}`}>
                Amount sent ({agreedCurrencyCode})
              </label>
              <input
                id={`amt-${m.id}`}
                name="amountClaimed"
                type="number"
                step="0.00000001"
                min="0"
                required
                defaultValue={(agreedPriceAmount / 100).toFixed(2)}
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
              I paid with {m.name} — accept &amp; submit for verification
            </button>
          </form>
        </div>
      ))}

      <p className="text-xs text-text-muted">An admin reviews every submission by hand before access is granted — this isn't instant.</p>
    </div>
  );
}
