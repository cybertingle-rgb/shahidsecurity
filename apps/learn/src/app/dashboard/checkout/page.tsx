import Link from 'next/link';
import { listPurchasableProducts } from '@/lib/checkout';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

export default async function CheckoutCatalogPage() {
  const products = await listPurchasableProducts();

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Buy a membership or course</h1>

      {products.length === 0 && <p className="text-text-muted">Nothing is available for purchase yet.</p>}

      <div className="grid gap-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{p.name}</p>
                {p.description && <p className="mt-1 text-sm text-text-muted">{p.description}</p>}
              </div>
              <p className="font-semibold text-neon">{formatAmount(p.price.amount, p.price.currencyCode)}</p>
            </div>
            <Link href={`/dashboard/checkout/${p.id}`} className="mt-3 inline-block rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
              Buy now
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
