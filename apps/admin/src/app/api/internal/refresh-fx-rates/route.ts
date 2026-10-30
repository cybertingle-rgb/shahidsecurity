import { NextRequest, NextResponse } from 'next/server';
import { refreshFxRates } from '@/lib/pricing/fxRates';
import { logAudit } from '@/lib/audit';

/**
 * Secret-gated FX-rate refresh sweep — same reasoning and shape as
 * /api/internal/publish-scheduled (this app has no long-running cron
 * process of its own; something external has to call this on a
 * schedule). Wire up Hostinger hPanel's Cron Jobs feature to POST this
 * URL with the header below every 6 hours — see docs/PRICING.md. The
 * provider (open.er-api.com, see src/lib/pricing/fxRates.ts) only
 * actually updates about once a day, so this cadence is comfortably
 * ahead of staleness (fxRates.FX_RATES_STALE_AFTER_MS = 36h) without
 * hammering a free, keyless API. Until that cron is configured, the
 * public pricing page still works — it just serves USD (or whatever
 * was last cached before this was ever wired up) per
 * convertFromUsd()'s documented fallback behavior, never a crash.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.FX_REFRESH_SECRET;
  const provided = request.headers.get('x-fx-refresh-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await refreshFxRates();
    await logAudit({
      actorUserId: null,
      action: 'fx_rates.refreshed',
      targetType: 'fx_rates',
      targetId: null,
      metadata: { updatedCount: result.updated.length, skipped: result.skipped },
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}
