import { listOrders } from '@/lib/admin/orders';

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="text-sm text-text-muted">Most recent 100. Pending manual-payment orders are actioned from the Payments page.</p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Order #</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-2">{o.orderNumber}</td>
                <td className="px-4 py-2">
                  {o.studentName}
                  <div className="text-xs text-text-muted">{o.studentEmail}</div>
                </td>
                <td className="px-4 py-2 text-text-muted">{o.productName}</td>
                <td className="px-4 py-2">
                  {(o.amount / 100).toFixed(2)} {o.currencyCode}
                </td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2 text-text-muted">{o.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
