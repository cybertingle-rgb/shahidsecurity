import { db } from '@/db';
import { auditLogs } from '@/db/schema';

/**
 * Every sensitive admin action writes here — content published, lead
 * status changed, payment recorded, Google account connected/
 * disconnected, role changed, etc. Insert-only: see
 * src/db/apply-grants.ts for how that's enforced at the database level.
 *
 * `metadata` must never contain a password, OAuth token, payment card
 * number/CVV, or client secret — every call site is responsible for
 * that, this function does no redaction of its own.
 */
export async function logAudit(entry: {
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}
