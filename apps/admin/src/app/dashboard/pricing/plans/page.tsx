import Link from 'next/link';
import { listAllPlans } from '@/lib/pricing/plans';
import { createPricingPlan, updatePricingPlan, setPricingPlanStatus, deletePricingPlan } from './actions';

const STATUSES = ['draft', 'active', 'disabled'] as const;
const CATEGORIES = ['assurance', 'managed_security'] as const;
const CATEGORY_LABEL: Record<string, string> = { assurance: 'Security Assurance (monthly plan)', managed_security: 'Managed Security Operations' };

export default async function PricingPlansPage() {
  const plans = await listAllPlans();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/pricing" className="text-sm text-neon underline">
          ← Back to pricing
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Pricing plans</h1>
        <p className="text-sm text-text-muted">
          Every plan shown on shahidiqbal.com/pricing comes from here — nothing is hardcoded on the page itself. Only{' '}
          <strong className="text-text">active</strong> plans appear publicly. A plan with “Requires 24/7 readiness” checked is never shown as
          purchasable unless 24/7 SOC availability (set on the Pricing overview page) is Active.
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((p) => (
          <details key={p.id} className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer font-medium">
              {p.name} <span className="text-xs text-text-muted">({CATEGORY_LABEL[p.category]})</span>{' '}
              <span className={`text-xs ${p.status === 'active' ? 'text-neon' : p.status === 'disabled' ? 'text-danger' : 'text-text-muted'}`}>
                {p.status}
              </span>
              {p.isRecommended && <span className="ml-1 text-xs text-neon">★ recommended</span>}
            </summary>
            <form action={updatePricingPlan.bind(null, p.id)} className="mt-3 space-y-3">
              <PlanFields defaults={p} />
              <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                Save
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-3">
              {STATUSES.filter((s) => s !== p.status).map((s) => (
                <form key={s} action={setPricingPlanStatus.bind(null, p.id, s)}>
                  <button type="submit" className="text-xs text-neon">
                    Mark {s}
                  </button>
                </form>
              ))}
              <form action={deletePricingPlan.bind(null, p.id)}>
                <button type="submit" className="text-xs text-danger">
                  Delete
                </button>
              </form>
            </div>
          </details>
        ))}
        {plans.length === 0 && <p className="text-sm text-text-muted">No plans yet — add one below.</p>}
      </div>

      <form action={createPricingPlan} className="space-y-3 rounded-lg border border-dashed border-border-strong p-4">
        <h2 className="font-medium">Add a plan</h2>
        <PlanFields />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add plan (saved as draft)
        </button>
      </form>
    </div>
  );
}

type PlanDefaults = {
  slug?: string;
  name?: string;
  targetAudience?: string | null;
  category?: string;
  monthlyPriceUsd?: string | null;
  isStartingAtPrice?: boolean;
  minContractMonths?: number;
  includedFeatures?: string[];
  includedAssetLimit?: number | null;
  includedAnalystHoursPerMonth?: number | null;
  isRecommended?: boolean;
  ctaLabel?: string | null;
  requiresEnterpriseContact?: boolean;
  requires24x7Readiness?: boolean;
};

function PlanFields({ defaults }: { defaults?: PlanDefaults }) {
  const d = defaults ?? {};
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-text-muted">Name</label>
          <input name="name" defaultValue={d.name} required className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Slug (URL-safe, unique)</label>
          <input name="slug" defaultValue={d.slug} required placeholder="security-essential" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm font-mono" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted">Target audience</label>
        <input name="targetAudience" defaultValue={d.targetAudience ?? ''} placeholder="Startups and micro-businesses" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-text-muted">Category</label>
          <select name="category" defaultValue={d.category ?? 'assurance'} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted">Monthly price (USD, blank = fully custom-quoted)</label>
          <input name="monthlyPriceUsd" defaultValue={d.monthlyPriceUsd ?? ''} placeholder="499.00" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Min. contract (months)</label>
          <input name="minContractMonths" type="number" min={1} defaultValue={d.minContractMonths ?? 3} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-text-muted">Included asset limit (blank = unlimited/custom)</label>
          <input name="includedAssetLimit" type="number" min={0} defaultValue={d.includedAssetLimit ?? ''} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-text-muted">Included analyst hours/month (blank = custom)</label>
          <input name="includedAnalystHoursPerMonth" type="number" min={0} defaultValue={d.includedAnalystHoursPerMonth ?? ''} className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-text-muted">Included features (one per line)</label>
        <textarea
          name="includedFeatures"
          defaultValue={(d.includedFeatures ?? []).join('\n')}
          rows={6}
          className="w-full rounded-md border border-border bg-bg px-2 py-1 font-mono text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-text-muted">CTA button label</label>
        <input name="ctaLabel" defaultValue={d.ctaLabel ?? ''} placeholder="Get Started" className="w-full rounded-md border border-border bg-bg px-2 py-1 text-sm" />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isStartingAtPrice" defaultChecked={d.isStartingAtPrice} /> Price shown as “From” (not fixed)
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="isRecommended" defaultChecked={d.isRecommended} /> Recommended plan
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="requiresEnterpriseContact" defaultChecked={d.requiresEnterpriseContact} /> No self-serve — proposal/inquiry only
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="requires24x7Readiness" defaultChecked={d.requires24x7Readiness} /> Requires 24/7 SOC readiness to sell
        </label>
      </div>
    </>
  );
}
