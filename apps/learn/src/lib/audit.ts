import { db } from '@/db';
import { auditLogs } from '@/db/schema';

/**
 * Every sensitive admin action writes here — course published, student
 * suspended, payment approved/refunded, price changed, community link
 * changed, role changed — per docs/lms-security.md. Insert-only: see
 * src/db/apply-grants.ts for how that's enforced at the database level,
 * not just by never calling update()/delete() here.
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
