import Link from 'next/link';
import { listCommunities, listAllProducts } from '@/lib/admin/communities';
import { createCommunity, toggleCommunityStatus } from './actions';

export default async function CommunitiesPage() {
  const [communities, products] = await Promise.all([listCommunities(), listAllProducts()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Communities</h1>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Platform</th>
              <th className="px-4 py-2">Requires</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {communities.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/admin/communities/${c.id}`} className="text-neon">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{c.platform}</td>
                <td className="px-4 py-2 text-text-muted">{c.requiredProductName ?? '—'}</td>
                <td className="px-4 py-2">{c.status}</td>
                <td className="px-4 py-2">
                  <form action={toggleCommunityStatus.bind(null, c.id, c.status === 'active' ? 'inactive' : 'active')}>
                    <button type="submit" className="text-sm text-neon">
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {communities.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No communities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form action={createCommunity} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted">Name</label>
          <input name="name" required className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">Platform</label>
          <select name="platform" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
            <option value="discord">Discord</option>
            <option value="facebook">Facebook</option>
            <option value="telegram">Telegram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="min-w-[16rem] flex-1">
          <label className="block text-sm text-text-muted">Invite URL</label>
          <input name="url" type="url" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-text-muted">Requires product</label>
          <select name="requiredProductId" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
            <option value="">Any / none</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add community
        </button>
      </form>
    </div>
  );
}
