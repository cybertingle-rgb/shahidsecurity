import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { enrollments, courses, courseProgress, products, memberships, communities, communityAccess, orders, users } from '@/db/schema';

/**
 * Every function here takes the current session's userId and scopes its
 * query by it — the IDOR-safe pattern from docs/lms-security.md. None of
 * these ever take an arbitrary id from a route param, on purpose: there is
 * no "view another student's dashboard" surface to secure because it
 * structurally doesn't exist.
 */

export async function getMyEnrollments(userId: string) {
  return db
    .select({
      enrollmentId: enrollments.id,
      status: enrollments.status,
      enrolledAt: enrollments.enrolledAt,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      productName: products.name,
      percentComplete: courseProgress.percentComplete,
    })
    .from(enrollments)
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(products, eq(enrollments.productId, products.id))
    .leftJoin(courseProgress, eq(courseProgress.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active')))
    .orderBy(desc(enrollments.enrolledAt));
}

/** The single furthest-along, still-incomplete course — docs/lms-student-guide.md's "Continue Learning" card. */
export async function getContinueLearning(userId: string) {
  const rows = await db
    .select({
      enrollmentId: enrollments.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      percentComplete: courseProgress.percentComplete,
      updatedAt: courseProgress.updatedAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .innerJoin(courseProgress, eq(courseProgress.enrollmentId, enrollments.id))
    .where(and(eq(enrollments.userId, userId), eq(enrollments.status, 'active')))
    .orderBy(desc(courseProgress.updatedAt))
    .limit(1);

  const row = rows[0];
  if (!row || row.percentComplete >= 100) return null;
  return row;
}

export async function getMyMembership(userId: string) {
  const [row] = await db
    .select({
      id: memberships.id,
      status: memberships.status,
      startedAt: memberships.startedAt,
      expiresAt: memberships.expiresAt,
      productName: products.name,
    })
    .from(memberships)
    .innerJoin(products, eq(memberships.productId, products.id))
    .where(eq(memberships.userId, userId))
    .orderBy(desc(memberships.startedAt))
    .limit(1);
  return row ?? null;
}

export async function getMyCommunities(userId: string) {
  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      platform: communities.platform,
      url: communities.url,
      accessStatus: communityAccess.status,
    })
    .from(communityAccess)
    .innerJoin(communities, eq(communityAccess.communityId, communities.id))
    .where(and(eq(communityAccess.userId, userId), eq(communities.status, 'active')));

  // The invite link is only ever handed to someone who's actually cleared
  // to use it — "eligible" alone doesn't mean "here's the link" per
  // docs/lms-security.md and the community_access state machine.
  return rows.map((r) => ({
    ...r,
    url: r.accessStatus === 'invited' || r.accessStatus === 'joined' ? r.url : null,
  }));
}

export async function getMyOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      amount: orders.amount,
      currencyCode: orders.currencyCode,
      status: orders.status,
      createdAt: orders.createdAt,
      productName: products.name,
    })
    .from(orders)
    .innerJoin(products, eq(orders.productId, products.id))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getMyProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}
