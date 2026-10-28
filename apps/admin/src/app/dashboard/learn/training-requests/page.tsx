import Link from 'next/link';
import { listTrainingRequests, isTrainingRequestStatus, type TrainingRequestStatus } from '@/lib/learn/trainingRequests';

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

export default async function TrainingRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: statusParam } = await searchParams;
  const status = statusParam && isTrainingRequestStatus(statusParam) ? statusParam : undefined;

  const requests = await listTrainingRequests(status ? { status } : undefined);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Personal Training requests</h1>
        <p className="mt-1 text-sm text-text-muted">
          Students requesting instructor-led Personal Training — review, discuss scope and pricing, then record the agreed terms here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <Link href="/dashboard/learn/training-requests" className={`rounded-full border px-3 py-1 text-xs ${!status ? 'border-neon text-neon' : 'border-border-strong text-text-muted'}`}>
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/dashboard/learn/training-requests?status=${s}`}
            className={`rounded-full border px-3 py-1 text-xs ${status === s ? 'border-neon text-neon' : 'border-border-strong text-text-muted'}`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-text-muted">No requests{status ? ` with status "${STATUS_LABEL[status]}"` : ''} yet.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/learn/training-requests/${r.id}`}
              className="flex items-center justify-between rounded-lg border border-border p-4 text-sm hover:border-neon"
            >
              <div>
                <p className="font-medium">{r.areaOfInterest}</p>
                <p className="text-xs text-text-muted">
                  {r.studentName} · {r.studentEmail} · {r.experienceLevel}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded-full border border-border-strong px-2 py-0.5 text-xs text-text-muted">{STATUS_LABEL[r.status as TrainingRequestStatus]}</span>
                {r.agreedPriceAmount != null && r.agreedCurrencyCode && (
                  <p className="mt-1 text-xs text-text-muted">{formatAmount(r.agreedPriceAmount, r.agreedCurrencyCode)}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
