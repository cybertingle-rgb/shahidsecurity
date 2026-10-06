import { listConsultations } from '@/lib/leads';
import { updateConsultationStatus } from '../actions';
import type { Consultation } from '@/db/schema';

const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

function ConsultationRow({ consultation }: { consultation: Consultation }) {
  const boundUpdate = updateConsultationStatus.bind(null, consultation.id);

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2">{consultation.fullName}</td>
      <td className="px-4 py-2 text-text-muted">{consultation.phone ?? '—'}</td>
      <td className="px-4 py-2 text-text-muted">{consultation.country ?? '—'}</td>
      <td className="px-4 py-2 text-text-muted">{consultation.requestedAt.toLocaleString()}</td>
      <td className="px-4 py-2">
        <form action={boundUpdate} className="flex items-center gap-2">
          <select name="status" defaultValue={consultation.status} className="rounded border border-border bg-bg px-2 py-1 text-xs">
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
    </tr>
  );
}

export default async function ConsultationsPage() {
  const consultations = await listConsultations();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Consultation requests</h1>
      <p className="text-sm text-text-muted">
        From the booking form on shahidiqbal.com, which (by design) never collects an email — confirmation happens over
        phone/WhatsApp.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Requested for</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((c) => (
              <ConsultationRow key={c.id} consultation={c} />
            ))}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                  No consultation requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
