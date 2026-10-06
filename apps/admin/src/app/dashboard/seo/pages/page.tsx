import Link from 'next/link';
import { listSeoPages } from '@/lib/seo';

export default async function SeoPagesPage() {
  const pages = await listSeoPages();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Per-page SEO overrides</h1>
        <Link href="/dashboard/seo/pages/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New override
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Path</th>
              <th className="px-4 py-2">Title override</th>
              <th className="px-4 py-2">Robots</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/seo/pages/${p.id}`} className="text-neon">
                    {p.path}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{p.title ?? '—'}</td>
                <td className="px-4 py-2 text-text-muted">{p.robotsDirective ?? '—'}</td>
                <td className="px-4 py-2 text-text-muted">{p.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No overrides yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
