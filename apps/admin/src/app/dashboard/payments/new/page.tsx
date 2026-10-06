import { listCustomers } from '@/lib/payments';
import { createInvoice } from '../actions';

export default async function NewInvoicePage() {
  const customers = await listCustomers();

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">New invoice</h1>
      {customers.length === 0 ? (
        <p className="rounded-lg border border-border bg-bg-elevated/60 p-4 text-sm text-text-muted">
          No customers yet — convert a lead to a customer first (Customers &amp; Leads).
        </p>
      ) : (
        <form action={createInvoice} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
          <div className="space-y-1">
            <label className="text-xs text-text-muted" htmlFor="customerId">
              Customer
            </label>
            <select id="customerId" name="customerId" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-text-muted" htmlFor="amountDue">
                Amount
              </label>
              <input id="amountDue" name="amountDue" type="number" min="0.01" step="0.01" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-muted" htmlFor="currency">
                Currency
              </label>
              <input id="currency" name="currency" defaultValue="USD" maxLength={3} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted" htmlFor="dueDate">
              Due date
            </label>
            <input id="dueDate" name="dueDate" type="date" className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Create invoice
          </button>
        </form>
      )}
    </div>
  );
}
