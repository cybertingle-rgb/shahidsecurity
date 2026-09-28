import { NextResponse } from 'next/server';
import { listPurchasableProducts } from '@/lib/checkout';

/**
 * Public, unauthenticated, read-only — feeds the marketing site's
 * build-time fetch for /learn/pricing. Reuses the same server-side price
 * resolution checkout itself uses (never a hardcoded amount anywhere —
 * docs/LMS_DECISIONS.md #8), so the marketing page and the actual
 * checkout flow can never quote two different numbers.
 */
export async function GET() {
  const products = await listPurchasableProducts();
  return NextResponse.json(
    {
      products: products.map((p) => ({ name: p.name, description: p.description, type: p.type, amount: p.price.amount, currencyCode: p.price.currencyCode })),
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
