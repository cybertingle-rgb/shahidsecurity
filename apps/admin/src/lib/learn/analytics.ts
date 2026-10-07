import { sql, eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { users, enrollments, orders } = learnSchema;

/**
 * Phase 11 — "basic" per docs/LMS_V1_SCOPE.md: the counts/lists the
 * schema already produces, nothing more. No charts, funnels, cohorts, or
 * exports — that's the "Advanced analytics" V2 line in the same doc.
 */
export async function getAdminOverviewStats() {
  const [[studentRow], [enrollmentRow], [orderRow], [revenueRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(enrollments).where(eq(enrollments.status, 'active')),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db
      .select({ total: sql<number>`coalesce(sum(${orders.amount}), 0)` })
      .from(orders)
      .where(eq(orders.status, 'paid')),
  ]);

  return {
    totalStudents: Number(studentRow?.count ?? 0),
    activeEnrollments: Number(enrollmentRow?.count ?? 0),
    totalOrders: Number(orderRow?.count ?? 0),
    // Minor units (paisa) — revenue is always PKR in V1 per LMS_V1_SCOPE.md.
    totalRevenueMinorUnits: Number(revenueRow?.total ?? 0),
  };
}
