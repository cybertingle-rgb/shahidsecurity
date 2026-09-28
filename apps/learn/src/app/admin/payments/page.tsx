import { listPendingManualPayments } from '@/lib/admin/payments';
import { approveManualPayment, rejectManualPayment, requestClarification } from './actions';

export default async function PaymentsPage() {
  const pending = await listPendingManualPayments();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Payments — pending verification</h1>
      <p className="text-sm text-text-muted">
        A submitted receipt never grants access by itself — approving here is the only action that flips an order to paid and creates the enrollment.
      </p>

      <div className="space-y-4">
        {pending.map((p) => (
          <div key={p.submissionId} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">
                  {p.studentName} <span className="text-text-muted">({p.studentEmail})</span>
                </p>
                <p className="text-sm text-text-muted">
                  {p.productName} — order {p.orderNumber} — {(p.amount / 100).toFixed(2)} {p.currencyCode}
                  {p.paymentMethodName && <span> — via {p.paymentMethodName}</span>}
                </p>
                <p className="text-sm text-text-muted">
                  Claimed: {(p.amountClaimed / 100).toFixed(2)} on {p.paymentDate.toLocaleDateString()}, ref {p.transactionReference}
                </p>
                {p.receiptFileUrl && (
                  <a href={p.receiptFileUrl} className="text-sm text-neon" target="_blank" rel="noreferrer">
                    View receipt
                  </a>
                )}
              </div>
              <form action={approveManualPayment.bind(null, p.submissionId)}>
                <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
                  Approve
                </button>
              </form>
            </div>

            <div className="mt-3 flex gap-2">
              <form action={rejectManualPayment.bind(null, p.submissionId)} className="flex gap-2">
                <input name="note" placeholder="Reason (optional)" className="rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm" />
                <button type="submit" className="rounded-md border border-danger px-3 py-1.5 text-sm text-danger">
                  Reject
                </button>
              </form>
              <form action={requestClarification.bind(null, p.submissionId)} className="flex gap-2">
                <input name="note" placeholder="What's needed?" required className="rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm" />
                <button type="submit" className="rounded-md border border-border-strong px-3 py-1.5 text-sm">
                  Request clarification
                </button>
              </form>
            </div>
          </div>
        ))}
        {pending.length === 0 && <p className="text-text-muted">Nothing pending verification.</p>}
      </div>
    </div>
  );
}
