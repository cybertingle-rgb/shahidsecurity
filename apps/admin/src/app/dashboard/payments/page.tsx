import Link from 'next/link';
import { listInvoices, paymentProviderStatus } from '@/lib/payments';

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-text-muted',
  sent: 'text-warn',
  paid: 'text-neon-soft',
  void: 'text-text-muted',
  overdue: 'text-danger',
};

export default async function PaymentsPage() {
  const [invoices, providerStatus] = await Promise.all([listInvoices(), paymentProviderStatus()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <div className="flex gap-3">
          <Link href="/dashboard/payments/methods" className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text">
            Payment methods
          </Link>
          <Link href="/dashboard/payments/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            New invoice
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-bg-elevated/60 p-4 text-sm text-text-muted">
        Payment provider: <strong className="text-text">{providerStatus.provider}</strong>.{' '}
        {providerStatus.isLiveGatewayConfigured
          ? 'A live gateway is configured.'
          : 'No live gateway is configured — every payment here is recorded manually (e.g. a confirmed bank transfer), never processed by this app.'}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/payments/${inv.id}`} className="text-neon">
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{inv.customerName}</td>
                <td className="px-4 py-2 text-text-muted">
                  {inv.currency} {inv.amountDue}
                </td>
                <td className="px-4 py-2">
                  <span className={STATUS_COLOR[inv.status]}>{inv.status}</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{inv.dueDate ? inv.dueDate.toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
