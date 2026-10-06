import { notFound } from 'next/navigation';
import { getLeadById } from '@/lib/leads';
import { updateLeadStatus, convertLeadToCustomer } from '../actions';

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const boundUpdate = updateLeadStatus.bind(null, id);
  const convert = convertLeadToCustomer.bind(null, id);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{lead.fullName}</h1>
      <dl className="space-y-2 rounded-lg border border-border bg-bg-elevated/60 p-4 text-sm">
        <Row label="Email" value={lead.email ?? '—'} />
        <Row label="Phone" value={lead.phone ?? '—'} />
        <Row label="Company" value={lead.company ?? '—'} />
        <Row label="Source" value={lead.source ?? '—'} />
        <Row label="Received" value={lead.createdAt.toLocaleString()} />
        {lead.message && (
          <div>
            <dt className="text-xs text-text-muted">Message</dt>
            <dd className="mt-1 whitespace-pre-wrap">{lead.message}</dd>
          </div>
        )}
      </dl>

      <form action={boundUpdate} className="flex items-center gap-2">
        <select name="status" defaultValue={lead.status} className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Update status
        </button>
      </form>

      {lead.status !== 'converted' && (
        <form action={convert}>
          <button type="submit" className="rounded-md border border-neon px-4 py-2 text-sm text-neon">
            Convert to customer
          </button>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
