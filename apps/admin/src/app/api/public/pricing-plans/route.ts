import { NextRequest, NextResponse } from 'next/server';
import { listActivePlans, listActiveAddOns, getOrCreateConsultationSettings, getOrCreateSocReadinessSettings } from '@/lib/pricing/plans';
import { convertFromUsd } from '@/lib/pricing/fxRates';
import { FALLBACK_CURRENCY } from '@/lib/pricing/currency';
import { checkRateLimit } from '@/lib/auth/rateLimit';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Serves active pricing plans, add-ons, the current consultation fee,
 * and 24/7 SOC availability — the single source of truth the public
 * /pricing page (Astro, build-time fetch, same pattern as apps/learn's
 * /api/public/pricing) and its client-side currency widget both read
 * from. `?currency=XXX` converts every USD figure using the cached FX
 * rate (convertFromUsd falls back to USD automatically if that
 * currency has no cached rate yet) — omit it to get plain USD figures
 * only, which is what the Astro build-time fetch does (it has no
 * visitor to convert for).
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`pricing-plans:ip:${ip}`, { maxAttempts: 120, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS_HEADERS });
  }

  const requestedCurrency = new URL(request.url).searchParams.get('currency')?.toUpperCase() || FALLBACK_CURRENCY;

  const [plans, addOns, consultationSettings, socSettings] = await Promise.all([
    listActivePlans(),
    listActiveAddOns(),
    getOrCreateConsultationSettings(),
    getOrCreateSocReadinessSettings(),
  ]);

  const convertedPlans = await Promise.all(
    plans.map(async (plan) => {
      const usdAmount = plan.monthlyPriceUsd ? Number(plan.monthlyPriceUsd) : null;
      const converted = usdAmount !== null ? await convertFromUsd(usdAmount, requestedCurrency) : null;
      // A managed_security plan gated by requires24x7Readiness is only
      // ever actually purchasable when SOC availability is 'active' —
      // see docs/SOC_READINESS.md and pricing_plans' own schema comment.
      // Every other plan is purchasable whenever it's active, independent
      // of this setting.
      const purchasable = plan.requires24x7Readiness ? socSettings.availability === 'active' : true;
      return {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        targetAudience: plan.targetAudience,
        category: plan.category,
        monthlyPriceUsd: usdAmount,
        isStartingAtPrice: plan.isStartingAtPrice,
        minContractMonths: plan.minContractMonths,
        includedFeatures: plan.includedFeatures,
        includedAssetLimit: plan.includedAssetLimit,
        includedAnalystHoursPerMonth: plan.includedAnalystHoursPerMonth,
        isRecommended: plan.isRecommended,
        ctaLabel: plan.ctaLabel,
        requiresEnterpriseContact: plan.requiresEnterpriseContact,
        requires24x7Readiness: plan.requires24x7Readiness,
        purchasable,
        converted,
      };
    }),
  );

  const convertedAddOns = await Promise.all(
    addOns.map(async (addOn) => {
      const usdAmount = addOn.startingPriceUsd ? Number(addOn.startingPriceUsd) : null;
      const converted = usdAmount !== null ? await convertFromUsd(usdAmount, requestedCurrency) : null;
      return { id: addOn.id, slug: addOn.slug, name: addOn.name, description: addOn.description, startingPriceUsd: usdAmount, converted };
    }),
  );

  const consultationFeeUsd = Number(consultationSettings.feeUsd);
  const consultationConverted = await convertFromUsd(consultationFeeUsd, requestedCurrency);

  return NextResponse.json(
    {
      plans: convertedPlans,
      addOns: convertedAddOns,
      consultation: {
        feeUsd: consultationFeeUsd,
        durationMinutes: consultationSettings.durationMinutes,
        isRefundable: consultationSettings.isRefundable,
        refundPolicyText: consultationSettings.refundPolicyText,
        converted: consultationConverted,
      },
      socAvailability: socSettings.availability,
      requestedCurrency,
    },
    { headers: CORS_HEADERS },
  );
}
