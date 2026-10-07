import { learnDb, learnSchema } from '@/db/learnDb';

/**
 * Writes to apps/learn's own audit_logs table (via learnDb), not this
 * app's own audit log — these entries describe mutations to Learn's
 * data. actorUserId is a real FK to Learn's own users table, so an admin
 * staff member (who has no row there) is always logged as null there;
 * callers fold the staff member's email into metadata instead.
 */
export async function logLearnAudit(entry: {
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await learnDb.insert(learnSchema.auditLogs).values({
    id: crypto.randomUUID(),
    actorUserId: entry.actorUserId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? null,
    ipAddress: entry.ipAddress ?? null,
  });
}
