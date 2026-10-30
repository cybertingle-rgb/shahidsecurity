import Link from 'next/link';
import { listConsultations } from '@/lib/leads';
import { updateConsultationStatus } from '../actions';
import type { Consultation } from '@/db/schema';

const STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  pending_verification: 'Pending verification',
  succeeded: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

function ConsultationRow({ consultation }: { consultation: Consultation }) {
  const boundUpdate = updateConsultationStatus.bind(null, consultation.id);
  // Paid-consultation fields are all nullable — a row from the legacy
  // free book.php flow simply has none of them set (see crm.ts's
  // comment on the consultations table), so this card only renders
  // when there's actually something to show.
  const isPaidConsultation = consultation.feeUsd != null;

  return (
    <>
      <tr className="border-t border-border">
        <td className="px-4 py-2">{consultation.fullName}</td>
        <td className="px-4 py-2 text-text-muted">{consultation.email ?? '—'}</td>
        <td className="px-4 py-2 text-text-muted">{consultation.phone ?? '—'}</td>
        <td className="px-4 py-2 text-text-muted">{consultation.country ?? '—'}</td>
        <td className="px-4 py-2 text-text-muted">{consultation.requestedAt.toLocaleString()}</td>
        <td className="px-4 py-2 text-text-muted">
          {isPaidConsultation ? (
            <>
              ${Number(consultation.feeUsd).toFixed(2)}
              {consultation.displayedCurrency && consultation.displayedCurrency !== 'USD' && consultation.displayedAmount && (
                <span className="text-text-muted"> (≈{consultation.displayedCurrency} {Number(consultation.displayedAmount).toFixed(2)})</span>
              )}
            </>
          ) : (
            '—'
          )}
        </td>
        <td className="px-4 py-2">
          {consultation.paymentStatus ? (
            consultation.invoiceId ? (
              <Link href={`/dashboard/payments/${consultation.invoiceId}`} className="text-neon underline">
                {PAYMENT_STATUS_LABEL[consultation.paymentStatus] ?? consultation.paymentStatus}
              </Link>
            ) : (
              PAYMENT_STATUS_LABEL[consultation.paymentStatus] ?? consultation.paymentStatus
            )
          ) : (
            <span className="text-text-muted">— (free/legacy booking)</span>
          )}
        </td>
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
      {isPaidConsultation && (
        <tr className="border-t border-border bg-bg-elevated/30 text-xs text-text-muted">
          <td colSpan={8} className="px-4 py-2">
            {consultation.companyName && <span className="mr-3">Company: {consultation.companyName}</span>}
            {consultation.industry && <span className="mr-3">Industry: {consultation.industry}</span>}
            {consultation.companySize && <span className="mr-3">Size: {consultation.companySize}</span>}
            {consultation.preferredPackageSlug && <span className="mr-3">Interested in: {consultation.preferredPackageSlug}</span>}
            {consultation.timezone && <span className="mr-3">Timezone: {consultation.timezone}</span>}
            {consultation.securityConcern && <div className="mt-1">Concern: {consultation.securityConcern}</div>}
          </td>
        </tr>
      )}
    </>
  );
}

export default async function ConsultationsPage() {
  const consultations = await listConsultations();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Consultation requests</h1>
      <p className="text-sm text-text-muted">
        From the pricing page's paid consultation booking and the legacy shahidiqbal.com booking form. Payment is never marked paid here — verify
        and record it from the linked invoice (Payments) once it's actually received.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Requested for</th>
              <th className="px-4 py-2">Fee</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((c) => (
              <ConsultationRow key={c.id} consultation={c} />
            ))}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-text-muted">
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
