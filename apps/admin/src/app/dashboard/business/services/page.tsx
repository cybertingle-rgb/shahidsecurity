import Link from 'next/link';
import { listServices } from '@/lib/services';

export default async function ServicesPage() {
  const allServices = await listServices();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Services</h1>
        <Link href="/dashboard/business/services/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New service
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {allServices.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/business/services/${s.id}`} className="text-neon">
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{s.slug}</td>
                <td className="px-4 py-2">
                  <span className={s.status === 'published' ? 'text-neon-soft' : 'text-text-muted'}>{s.status}</span>
                </td>
                <td className="px-4 py-2 text-text-muted">{s.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {allServices.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
