import Link from 'next/link';
import { listAllAddOns } from '@/lib/pricing/plans';
import { createAddOnService, updateAddOnService, setAddOnServiceStatus, deleteAddOnService } from './actions';

const STATUSES = ['draft', 'active', 'disabled'] as const;

export default async function AddOnsPage() {
  const addOns = await listAllAddOns();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/pricing" className="text-sm text-neon underline">
          ← Back to pricing
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Specialist add-on services</h1>
        <p className="text-sm text-text-muted">
          One-off engagements shown separately from the monthly plans (penetration tests, assessments, forensics, ...). Leave the starting price
          blank for a service that's always “Custom Quote” (e.g. digital forensics).
        </p>
      </div>

      <div className="space-y-3">
        {addOns.map((a) => (
          <details key={a.id} className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">
              {a.name} <span className={`text-xs ${a.status === 'active' ? 'text-neon' : a.status === 'disabled' ? 'text-danger' : 'text-text-muted'}`}>{a.status}</span>
            </summary>
            <form action={updateAddOnService.bind(null, a.id)} className="mt-3 space-y-3">
              <AddOnFields defaults={a} />
              <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                Save
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-3">
              {STATUSES.filter((s) => s !== a.status).map((s) => (
                <form key={s} action={setAddOnServiceStatus.bind(null, a.id, s)}>
                  <button type="submit" className="text-xs text-neon">
                    Mark {s}
                  </button>
                </form>
              ))}
              <form action={deleteAddOnService.bind(null, a.id)}>
                <button type="submit" className="text-xs text-danger">
                  Delete
                </button>
              </form>
            </div>
          </details>
        ))}
        {addOns.length === 0 && <p className="text-sm text-text-muted">No add-ons yet — add one below.</p>}
      </div>

      <form action={createAddOnService} className="space-y-3 rounded-lg border border-dashed border-border-strong p-4">
        <h2 className="font-medium">Add a service</h2>
        <AddOnFields />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add service (saved as draft)
        </button>
      </form>
    </div>
  );
}

function AddOnFields({ defaults }: { defaults?: { slug?: string; name?: string; description?: string | null; startingPriceUsd?: string | null } }) {
  const d = defaults ?? {};
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-text-muted">Name</label>
          <input name="name" defaultValue={d.name} required className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Slug</label>
          <input name="slug" defaultValue={d.slug} required placeholder="web-app-penetration-test" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted">Description</label>
        <textarea name="description" defaultValue={d.description ?? ''} rows={2} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="block text-xs text-text-muted">Starting price (USD, blank = "Custom Quote")</label>
        <input name="startingPriceUsd" defaultValue={d.startingPriceUsd ?? ''} placeholder="750.00" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
      </div>
    </>
  );
}
