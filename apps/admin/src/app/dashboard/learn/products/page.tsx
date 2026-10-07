import Link from 'next/link';
import { listProducts } from '@/lib/learn/products';

export default async function LearnProductsPage() {
  const products = await listProducts();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/dashboard/learn/products/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New product
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/learn/products/${p.id}`} className="text-neon">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{p.type}</td>
                <td className="px-4 py-2 text-text-muted">{p.status}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
