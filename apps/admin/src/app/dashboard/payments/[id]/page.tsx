import { notFound } from 'next/navigation';
import { getInvoiceById, listPaymentsForInvoice, getTotalPaidForInvoice } from '@/lib/payments';
import { recordManualPayment, voidInvoice } from '../actions';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const [invoicePayments, totalPaid] = await Promise.all([listPaymentsForInvoice(id), getTotalPaidForInvoice(id)]);
  const remaining = Number(invoice.amountDue) - totalPaid;

  const boundRecordPayment = recordManualPayment.bind(null, id);
  const boundVoid = voidInvoice.bind(null, id);

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{invoice.invoiceNumber}</h1>
        <span className="text-sm text-text-muted">{invoice.status}</span>
      </div>

      <dl className="space-y-2 rounded-lg border border-border bg-bg-elevated/60 p-4 text-sm">
        <Row label="Customer" value={invoice.customerName} />
        <Row label="Amount due" value={`${invoice.currency} ${invoice.amountDue}`} />
        <Row label="Paid so far" value={`${invoice.currency} ${totalPaid.toFixed(2)}`} />
        <Row label="Remaining" value={`${invoice.currency} ${remaining.toFixed(2)}`} />
        <Row label="Due date" value={invoice.dueDate ? invoice.dueDate.toLocaleDateString() : '—'} />
      </dl>

      {invoice.status !== 'paid' && invoice.status !== 'void' && (
        <form action={boundRecordPayment} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
          <h2 className="text-sm font-medium">Record a manual payment</h2>
          <p className="text-xs text-text-muted">For a payment already received outside this app (e.g. a confirmed bank transfer) — this records it, it does not process one.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-text-muted" htmlFor="amount">
                Amount
              </label>
              <input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted" htmlFor="reference">
                Reference (optional)
              </label>
              <input id="reference" name="reference" placeholder="e.g. bank transfer ID" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Record payment
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Reference</th>
              <th className="px-4 py-2">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {invoicePayments.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  {p.currency} {p.amount}
                </td>
                <td className="px-4 py-2 text-text-muted">{p.provider}</td>
                <td className="px-4 py-2 text-text-muted">{p.providerPaymentRef ?? '—'}</td>
                <td className="px-4 py-2 text-text-muted">{p.createdAt.toLocaleString()}</td>
              </tr>
            ))}
            {invoicePayments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {invoice.status !== 'void' && (
        <form action={boundVoid}>
          <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
            Void invoice
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
