import Link from 'next/link';
import { listLeads } from '@/lib/leads';
import { updateLeadStatus } from './actions';
import type { Lead } from '@/db/schema';

const STATUS_COLOR: Record<string, string> = {
  new: 'text-neon-soft',
  contacted: 'text-warn',
  qualified: 'text-neon',
  converted: 'text-text-muted',
  lost: 'text-danger',
};

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

function LeadRow({ lead }: { lead: Lead }) {
  const boundUpdate = updateLeadStatus.bind(null, lead.id);

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2">
        <Link href={`/dashboard/leads/${lead.id}`} className="text-neon">
          {lead.fullName}
        </Link>
      </td>
      <td className="px-4 py-2 text-text-muted">{lead.email ?? lead.phone ?? '—'}</td>
      <td className="px-4 py-2 text-text-muted">{lead.source ?? '—'}</td>
      <td className="px-4 py-2">
        <form action={boundUpdate} className="flex items-center gap-2">
          <select name="status" defaultValue={lead.status} className={`rounded border border-border bg-bg px-2 py-1 text-xs ${STATUS_COLOR[lead.status]}`}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="text-xs text-text-muted underline">
            update
          </button>
        </form>
      </td>
      <td className="px-4 py-2 text-text-muted">{lead.createdAt.toLocaleString()}</td>
    </tr>
  );
}

export default async function LeadsPage() {
  const allLeads = await listLeads();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <Link href="/dashboard/leads/consultations" className="text-sm text-neon">
          Consultations →
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Received</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.map((lead) => (
              <LeadRow key={lead.id} lead={lead} />
            ))}
            {allLeads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
