import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/admin-core/db';
import { consultationSettings } from '@/admin-core/db/schema';
import { getOrCreateConsultationSettings } from '@/admin-core/lib/pricing/plans';
import { eq } from 'drizzle-orm';

/**
 * One-off admin utility, same SEED_SECRET-gated pattern as
 * /api/internal/seed-pricing-data — this host has no shell access, so a
 * single real value needing to be set once (the production consultation
 * fee was showing $0.00) goes through a secret-gated route instead of a
 * direct DB connection. Unlike seedPricingData() this isn't idempotent
 * by design — it always overwrites feeUsd to the value given, since the
 * whole point is to set a specific real number, not insert-if-missing.
 * Safe to leave reachable: every future change to this value goes
 * through the dashboard's own updateConsultationSettings action, which
 * requires an authenticated admin session — this route doesn't replace
 * that, it's only how the one bootstrap value got set on a host nobody
 * can shell into.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const feeUsd = typeof body?.feeUsd === 'number' ? body.feeUsd : Number(body?.feeUsd);
  if (!Number.isFinite(feeUsd) || feeUsd < 0) {
    return NextResponse.json({ error: 'feeUsd must be a non-negative number' }, { status: 400 });
  }

  const current = await getOrCreateConsultationSettings();
  await db
    .update(consultationSettings)
    .set({ feeUsd: feeUsd.toFixed(2) })
    .where(eq(consultationSettings.id, current.id));

  return NextResponse.json({ success: true, feeUsd: feeUsd.toFixed(2) });
}
