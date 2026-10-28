import { describe, it, expect, afterEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
import { getCourseDeletionStatus, getCourse } from '@/lib/learn/courses';

const { courses, enrollments, products, orders, users } = learnSchema;

// Connects to apps/learn's own test database (LEARN_DATABASE_URL, set in
// vitest.config.ts) — the ported Learn admin section reads/writes that
// app's database directly, so testing it for real means testing against
// a real instance of that schema, not a mock. Each test cleans up only
// the specific rows it creates (never a full truncate) since this
// database is shared with apps/learn's own, separate test suite.
const createdCourseIds: string[] = [];
const createdUserIds: string[] = [];

afterEach(async () => {
  for (const courseId of createdCourseIds) {
    await db.delete(enrollments).where(eq(enrollments.courseId, courseId));
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.courseId, courseId));
    if (product) {
      await db.delete(orders).where(eq(orders.productId, product.id));
      await db.delete(products).where(eq(products.id, product.id));
    }
    await db.delete(courses).where(eq(courses.id, courseId));
  }
  for (const userId of createdUserIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  createdCourseIds.length = 0;
  createdUserIds.length = 0;
});

async function insertCourse(overrides: Partial<typeof courses.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await db.insert(courses).values({
    id,
    title: 'Test Course',
    slug: `test-course-${id}`,
    status: 'draft',
    level: 'beginner',
    ...overrides,
  });
  createdCourseIds.push(id);
  return id;
}

async function insertUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email: `test-user-${id}@example.com`,
    passwordHash: 'x',
    fullName: 'Test Student',
    ...overrides,
  });
  createdUserIds.push(id);
  return id;
}

describe('getCourseDeletionStatus', () => {
  it('reports canHardDelete true for a course with no enrollments and no linked product', async () => {
    const courseId = await insertCourse();
    expect(await getCourseDeletionStatus(courseId)).toEqual({ canHardDelete: true });
  });

  it('reports canHardDelete false with the real enrollment count when the course has an active enrollment', async () => {
    const courseId = await insertCourse();
    const userId = await insertUser();
    await db.insert(enrollments).values({ id: crypto.randomUUID(), userId, courseId, source: 'manual_admin_grant', status: 'active' });

    const status = await getCourseDeletionStatus(courseId);
    expect(status).toEqual({ canHardDelete: false, enrollmentCount: 1, orderCount: 0 });
  });

  it('reports canHardDelete false when the linked product has order history, even with zero enrollments', async () => {
    const courseId = await insertCourse();
    const productId = crypto.randomUUID();
    await db.insert(products).values({ id: productId, type: 'course', courseId, name: 'Test Course', status: 'inactive' });
    const userId = await insertUser();
    await db.insert(orders).values({
      id: crypto.randomUUID(),
      orderNumber: `TEST-${crypto.randomUUID()}`,
      userId,
      productId,
      status: 'paid',
      amount: 1000,
      currencyCode: 'USD',
    });

    const status = await getCourseDeletionStatus(courseId);
    expect(status).toEqual({ canHardDelete: false, enrollmentCount: 0, orderCount: 1 });
  });

  it('reports canHardDelete true for a course with a linked product that has never been ordered (e.g. a free course nobody enrolled in yet)', async () => {
    const courseId = await insertCourse();
    await db.insert(products).values({ id: crypto.randomUUID(), type: 'course', courseId, name: 'Test Course', status: 'active' });

    expect(await getCourseDeletionStatus(courseId)).toEqual({ canHardDelete: true });
  });
});

/**
 * Exercises the exact transaction shape `deleteCourse` (Server Action,
 * src/app/dashboard/learn/courses/actions.ts) runs — reproduced here
 * rather than calling the action directly, since the action's first line
 * is an auth check (requireAdminAction) that depends on a real
 * request-scoped session cookie this test harness has no way to fake.
 * The RBAC/auth layer itself is covered separately (tests/rbac.test.ts);
 * this covers the delete logic's actual data-safety behavior.
 */
async function runDeleteCourseTransaction(courseId: string) {
  await db.transaction(async (tx) => {
    const [raceCheckRow] = await tx.select({ count: sql<number>`count(*)` }).from(enrollments).where(eq(enrollments.courseId, courseId));
    if (Number(raceCheckRow?.count ?? 0) > 0) throw new Error('A student enrolled in this course just now — refresh and archive it instead of deleting.');

    const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.courseId, courseId));
    if (product) {
      const [orderRaceRow] = await tx.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.productId, product.id));
      if (Number(orderRaceRow?.count ?? 0) > 0) throw new Error('An order was just placed for this course — refresh and archive it instead of deleting.');
      await tx.delete(products).where(eq(products.id, product.id));
    }

    await tx.delete(courses).where(eq(courses.id, courseId));
  });
}

describe('deleteCourse transaction logic', () => {
  it('hard-deletes a course and its linked product when there is no history', async () => {
    const courseId = await insertCourse({ status: 'published' });
    const productId = crypto.randomUUID();
    await db.insert(products).values({ id: productId, type: 'course', courseId, name: 'Test Course', status: 'active' });

    await runDeleteCourseTransaction(courseId);

    expect(await getCourse(courseId)).toBeNull();
    const [remainingProduct] = await db.select().from(products).where(eq(products.id, productId));
    expect(remainingProduct).toBeUndefined();
  });

  it('refuses to delete, and leaves the course and enrollment intact, when a real enrollment exists', async () => {
    const courseId = await insertCourse();
    const userId = await insertUser();
    await db.insert(enrollments).values({ id: crypto.randomUUID(), userId, courseId, source: 'purchase', status: 'active' });

    await expect(runDeleteCourseTransaction(courseId)).rejects.toThrow(/enrolled/i);

    expect(await getCourse(courseId)).not.toBeNull();
    const [enrollment] = await db.select().from(enrollments).where(eq(enrollments.courseId, courseId));
    expect(enrollment).toBeDefined();
  });

  it('refuses to delete when the linked product has an order, leaving the course, product, and order intact', async () => {
    const courseId = await insertCourse();
    const productId = crypto.randomUUID();
    await db.insert(products).values({ id: productId, type: 'course', courseId, name: 'Test Course', status: 'inactive' });
    const userId = await insertUser();
    const orderId = crypto.randomUUID();
    await db.insert(orders).values({ id: orderId, orderNumber: `TEST-${orderId}`, userId, productId, status: 'paid', amount: 500, currencyCode: 'USD' });

    await expect(runDeleteCourseTransaction(courseId)).rejects.toThrow(/order/i);

    expect(await getCourse(courseId)).not.toBeNull();
    const [product] = await db.select().from(products).where(eq(products.id, productId));
    expect(product).toBeDefined();
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(order).toBeDefined();
  });
});
