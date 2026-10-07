import { notFound } from 'next/navigation';
import { getProduct, listPricesForProduct } from '@/lib/learn/products';
import ConfirmSubmitButton from '../../_components/ConfirmSubmitButton';
import { updateProduct, addPrice, deactivatePrice } from '../actions';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, productPrices] = await Promise.all([getProduct(id), listPricesForProduct(id)]);
  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">{product.name}</h1>

      <form action={updateProduct.bind(null, id)} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" defaultValue={product.name} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={product.description ?? ''}
            rows={3}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={product.status} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save changes
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Prices</h2>
        <p className="text-sm text-text-muted">
          Set the <strong className="text-text">USD</strong> price — that's the base every visitor's local-currency display (and the actual checkout
          charge) is derived from automatically. Only add another currency row here if you want to override the auto-converted amount for a specific
          market.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-muted">
              <tr>
                <th className="px-4 py-2">Currency</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {productPrices.map((price) => (
                <tr key={price.id} className="border-t border-border">
                  <td className="px-4 py-2">{price.currencyCode}</td>
                  <td className="px-4 py-2 text-text-muted">{price.countryCode ?? 'Default'}</td>
                  <td className="px-4 py-2">{(price.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-2">{price.isActive ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2">
                    {price.isActive && (
                      <form action={deactivatePrice.bind(null, price.id, id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Deactivate the ${price.currencyCode} price (${(price.amount / 100).toFixed(2)})? It will stop being offered at checkout.`}
                          className="text-sm text-danger"
                        >
                          Deactivate
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {productPrices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-text-muted">
                    No prices set yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={addPrice.bind(null, id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm text-text-muted">Currency (ISO 4217)</label>
            <input name="currencyCode" defaultValue="USD" maxLength={3} required className="w-24 rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-text-muted">Country (optional, ISO 3166-1 alpha-2)</label>
            <input name="countryCode" placeholder="AE" maxLength={2} className="w-24 rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-text-muted">Amount</label>
            <input name="amount" type="number" step="0.01" min="0.01" required className="w-32 rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Set price
          </button>
        </form>
      </section>
    </div>
  );
}
