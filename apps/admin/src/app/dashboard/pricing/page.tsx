import Link from 'next/link';
import { getOrCreateConsultationSettings, getOrCreateSocReadinessSettings, listActivePlans, listActiveAddOns } from '@/lib/pricing/plans';
import { updateConsultationSettings, updateSocReadiness } from './actions';

const SOC_AVAILABILITY_LABEL: Record<string, string> = {
  disabled: 'Disabled — not operationally ready (hidden as an active service on the public page)',
  inquiry_only: 'Inquiry Only — enterprise customers may request information, not purchase',
  active: 'Active — service can be sold (only set this after confirming real readiness)',
};

export default async function PricingOverviewPage() {
  const [consultation, socReadiness, activePlans, activeAddOns] = await Promise.all([
    getOrCreateConsultationSettings(),
    getOrCreateSocReadinessSettings(),
    listActivePlans(),
    listActiveAddOns(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Pricing</h1>
        <p className="text-sm text-text-muted">
          Everything shown on shahidiqbal.com/pricing — monthly support plans, add-on services, the paid consultation fee, and whether 24/7
          managed monitoring is actually for sale — is managed from here.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/dashboard/pricing/plans" className="rounded-lg border border-border px-4 py-3 text-sm hover:border-neon">
          Pricing plans <span className="text-text-muted">({activePlans.length} active)</span>
        </Link>
        <Link href="/dashboard/pricing/add-ons" className="rounded-lg border border-border px-4 py-3 text-sm hover:border-neon">
          Add-on services <span className="text-text-muted">({activeAddOns.length} active)</span>
        </Link>
      </div>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="font-medium">Consultation fee</h2>
        <p className="text-xs text-text-muted">
          The owner's consultation model is explicitly PAID — there is no free-consultation setting here. This fee is shown on the public pricing
          page's local-currency estimate and charged via the manual payment-pending workflow (no live payment gateway is configured).
        </p>
        <form action={updateConsultationSettings} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-text-muted">Fee (USD)</label>
              <input name="feeUsd" defaultValue={consultation.feeUsd} required className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted">Duration (minutes)</label>
              <input name="durationMinutes" type="number" min={15} defaultValue={consultation.durationMinutes} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <input type="checkbox" name="isRefundable" defaultChecked={consultation.isRefundable} /> This fee is refundable under the policy below
          </label>
          <div>
            <label className="block text-xs text-text-muted">
              Refund policy text (required to actually display a refund policy publicly — an unset field here never implies one)
            </label>
            <textarea
              name="refundPolicyText"
              defaultValue={consultation.refundPolicyText ?? ''}
              rows={3}
              placeholder="e.g. Fully refundable if cancelled more than 24 hours before the scheduled time."
              className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Save consultation settings
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="font-medium">24/7 managed monitoring availability</h2>
        <p className="text-xs text-text-muted">
          See docs/SOC_READINESS.md for the full staffing/readiness assessment. Defaults to Disabled and must be deliberately changed here —
          nothing in this codebase ever moves this out of Disabled on its own. Only move this to Active once internal 24/7 coverage, escalation,
          and backup staffing genuinely exist — not based on automated alerting alone.
        </p>
        <form action={updateSocReadiness} className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted">Availability</label>
            <select name="availability" defaultValue={socReadiness.availability} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm">
              {Object.entries(SOC_AVAILABILITY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted">Internal notes (not shown publicly)</label>
            <textarea name="notes" defaultValue={socReadiness.notes ?? ''} rows={2} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Save availability
          </button>
        </form>
      </section>
    </div>
  );
}
