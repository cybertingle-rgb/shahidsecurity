import { notFound } from 'next/navigation';
import { getTrainingRequest, type TrainingRequestStatus } from '@/lib/learn/trainingRequests';
import { updateTrainingRequestStatus, updateTrainingRequestNotes, updateTrainingRequestPrice } from '../actions';

const STATUS_LABEL: Record<TrainingRequestStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  contacted: 'Contacted',
  approved: 'Approved',
  declined: 'Declined',
  converted: 'Converted',
};

const ALL_STATUSES: TrainingRequestStatus[] = ['new', 'reviewing', 'contacted', 'approved', 'declined', 'converted'];

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toFixed(2)}`;
}

export default async function TrainingRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await getTrainingRequest(id);
  if (!request) notFound();

  const isConverted = request.status === 'converted';

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{request.areaOfInterest}</h1>
        <span className="rounded-full border border-border-strong px-2 py-0.5 text-xs text-text-muted">{STATUS_LABEL[request.status as TrainingRequestStatus]}</span>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4 text-sm">
        <div>
          <p className="text-xs text-text-muted">Student</p>
          <p>
            {request.studentName} · {request.studentEmail}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Submitted contact details</p>
          <p>
            {request.contactName} · {request.contactEmail}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Experience level</p>
          <p className="capitalize">{request.experienceLevel}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Format preference</p>
          <p className="capitalize">{request.formatPreference.replace('_', ' ')}</p>
        </div>
        {request.preferredAvailability && (
          <div>
            <p className="text-xs text-text-muted">Preferred availability</p>
            <p>{request.preferredAvailability}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-text-muted">Goals</p>
          <p className="whitespace-pre-wrap">{request.goals}</p>
        </div>
        {request.specialRequest && (
          <div>
            <p className="text-xs text-text-muted">Special request</p>
            <p className="whitespace-pre-wrap">{request.specialRequest}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Status</h2>
        <form action={updateTrainingRequestStatus.bind(null, id)} className="mt-3 flex flex-wrap items-end gap-2">
          <select name="status" defaultValue={request.status} disabled={isConverted} className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isConverted} className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">
            Update status
          </button>
        </form>
        {isConverted && <p className="mt-2 text-xs text-text-muted">This request has converted to a real booking and its status can no longer change.</p>}
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Agreed price</h2>
        <p className="mt-1 text-xs text-text-muted">
          Set this only after you and the student have actually discussed and agreed on scope, scheduling, and price. This never charges the
          student — they still have to open their request and explicitly accept it before any payment exists.
        </p>
        {request.agreedPriceAmount != null && request.agreedCurrencyCode && (
          <p className="mt-2 text-sm">
            Current: <strong>{formatAmount(request.agreedPriceAmount, request.agreedCurrencyCode)}</strong>
          </p>
        )}
        <form action={updateTrainingRequestPrice.bind(null, id)} className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-text-muted" htmlFor="agreedPriceAmount">
              Amount
            </label>
            <input
              id="agreedPriceAmount"
              name="agreedPriceAmount"
              type="number"
              step="0.01"
              min="0"
              disabled={isConverted}
              defaultValue={request.agreedPriceAmount != null ? (request.agreedPriceAmount / 100).toFixed(2) : ''}
              className="w-32 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted" htmlFor="agreedCurrencyCode">
              Currency
            </label>
            <input
              id="agreedCurrencyCode"
              name="agreedCurrencyCode"
              defaultValue={request.agreedCurrencyCode ?? 'USD'}
              disabled={isConverted}
              className="w-20 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={isConverted} className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">
            Save price
          </button>
        </form>
        <p className="mt-2 text-xs text-text-muted">
          Once the price is set, change this request's status to <strong>Approved</strong> so the student sees the offer on their own request page.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold">Internal notes</h2>
        <p className="mt-1 text-xs text-text-muted">Admin-only — the student never sees this.</p>
        <form action={updateTrainingRequestNotes.bind(null, id)} className="mt-3 space-y-2">
          <textarea name="internalNotes" rows={4} defaultValue={request.internalNotes ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-border-strong px-4 py-2 text-sm">
            Save notes
          </button>
        </form>
      </div>
    </div>
  );
}
