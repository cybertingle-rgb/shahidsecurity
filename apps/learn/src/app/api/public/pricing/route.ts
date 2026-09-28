import { NextRequest, NextResponse } from 'next/server';
import { listPurchasableProducts } from '@/lib/checkout';
import { localizeAmountForRequest } from '@/lib/currency';

/**
 * Public, unauthenticated, read-only — feeds the marketing site's
 * build-time fetch for /learn/pricing (always USD, since that fetch has
 * no real visitor behind it) *and* that same page's client-side
 * re-fetch from the visitor's own browser, which does have a real IP —
 * this is what actually localizes the displayed price per visitor.
 * Reuses the same server-side price resolution checkout itself uses
 * (never a hardcoded amount anywhere — docs/LMS_DECISIONS.md #8), so the
 * marketing page and the actual checkout flow can never quote two
 * different numbers. CORS-open and `private` cache: this is public data
 * with nothing to protect, but the response *does* vary per visitor
 * (their detected currency), so a shared cache must never reuse one
 * visitor's answer for another's.
 */
export async function GET(request: NextRequest) {
  const products = await listPurchasableProducts();
  const localized = await Promise.all(products.map((p) => localizeAmountForRequest(p.price.amount, request.headers)));

  return NextResponse.json(
    {
      products: products.map((p, i) => ({
        name: p.name,
        description: p.description,
        type: p.type,
        amount: p.price.amount,
        currencyCode: p.price.currencyCode,
        localizedAmount: localized[i]?.amount ?? p.price.amount,
        localizedCurrencyCode: localized[i]?.currencyCode ?? p.price.currencyCode,
      })),
    },
    { headers: { 'Cache-Control': 'private, max-age=60', 'Access-Control-Allow-Origin': '*' } },
  );
}
