import { and, eq, gt, count } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimitHits } from '@/db/schema';

/**
 * Simple DB-backed sliding-window limiter — same pattern as
 * apps/learn/src/lib/auth/rateLimit.ts. Sufficient for this app's volume
 * (a handful of staff accounts); add Redis only if that changes.
 */
export async function checkRateLimit(bucketKey: string, opts: { maxAttempts: number; windowMs: number }): Promise<boolean> {
  const windowStart = new Date(Date.now() - opts.windowMs);

  const rows = await db
    .select({ value: count() })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.bucketKey, bucketKey), gt(rateLimitHits.createdAt, windowStart)));
  const recentCount = rows[0]?.value ?? 0;

  if (recentCount >= opts.maxAttempts) {
    return false;
  }

  await db.insert(rateLimitHits).values({ bucketKey });
  return true;
}
