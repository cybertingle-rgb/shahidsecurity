import { NextRequest, NextResponse } from 'next/server';
import { seedPricingData } from '@/lib/pricing/seedPricingData';

/**
 * HTTP equivalent of src/db/seed-pricing-data.ts, for this host's usual
 * no-shell-access deploy — same reasoning as /api/internal/migrate.
 * Reuses SEED_SECRET (same gate as /api/internal/seed-super-admin —
 * both are "idempotent one-time setup" actions): safe to leave
 * reachable indefinitely since seedPricingData() never overwrites a
 * row an admin has since edited, but there's no reason to call it more
 * than once per environment either.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await seedPricingData();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
