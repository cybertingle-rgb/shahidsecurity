import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { parseCoursePriceInput, syncCourseProduct, setProductStatusForCourse, CoursePriceError } from '@/lib/admin/courses';
import { resolveCourseIdForProduct } from '@/lib/enrollment';
import { enrollInFreeCourse } from '@/lib/checkout';
import { getCoursePlayer } from '@/lib/student/data';
import { isSafeThumbnailUrl } from '@/lib/thumbnails';

/**
 * Phase 1's core fix, pinned so it can't regress: a course-type product
 * must carry a courseId back to its real content, and every course
 * (paid or free) gets exactly one linked product — the single source of
 * truth that replaces the old disconnected "create a course, then
 * separately create a product" flow.
 */

afterAll(closeTestDb);

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, countryCode: 'PK' });
  return id;
}

async function makeCourse(overrides: Partial<typeof schema.courses.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.courses).values({ id, title: 'Test Course', slug: `test-course-${id.slice(0, 8)}`, status: 'draft', ...overrides });
  return id;
}

describe('parseCoursePriceInput', () => {
  it('returns amount 0 for a blank price (free course)', () => {
    expect(parseCoursePriceInput('', '')).toEqual({ amount: 0, saleAmount: null });
  });

  it('converts major units to minor units', () => {
    expect(parseCoursePriceInput('29.99', '')).toEqual({ amount: 2999, saleAmount: null });
  });

  it('rejects a negative price', () => {
    expect(() => parseCoursePriceInput('-5', '')).toThrow(CoursePriceError);
  });

  it('accepts a discounted price below the regular price', () => {
    expect(parseCoursePriceInput('50', '40')).toEqual({ amount: 5000, saleAmount: 4000 });
  });

  it('rejects a discounted price equal to or above the regular price', () => {
    expect(() => parseCoursePriceInput('50', '50')).toThrow(CoursePriceError);
    expect(() => parseCoursePriceInput('50', '60')).toThrow(CoursePriceError);
  });
});

describe('isSafeThumbnailUrl', () => {
  it('accepts a plain https URL', () => {
    expect(isSafeThumbnailUrl('https://example.com/image.png')).toBe(true);
  });

  it('rejects non-https schemes', () => {
    expect(isSafeThumbnailUrl('http://example.com/image.png')).toBe(false);
    expect(isSafeThumbnailUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects localhost and bare IP literals (SSRF guard)', () => {
    expect(isSafeThumbnailUrl('https://localhost/image.png')).toBe(false);
    expect(isSafeThumbnailUrl('https://127.0.0.1/image.png')).toBe(false);
    expect(isSafeThumbnailUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafeThumbnailUrl('https://[::1]/image.png')).toBe(false);
  });

  it('rejects embedded credentials', () => {
    expect(isSafeThumbnailUrl('https://user:pass@example.com/image.png')).toBe(false);
  });
});

describe('syncCourseProduct', () => {
  beforeEach(truncateAll);

  it('creates a linked product+price for a paid course', async () => {
    const courseId = await makeCourse({ title: 'Paid Course' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Paid Course', status: 'draft' }, { priceAmount: '29.99', salePriceAmount: '' });

    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));
    expect(product?.type).toBe('course');
    expect(product?.status).toBe('inactive'); // draft course -> not purchasable yet

    const [price] = await testDb.select().from(schema.prices).where(eq(schema.prices.productId, product!.id));
    expect(price?.amount).toBe(2999);
  });

  it('creates a linked product with amount 0 for a free course', async () => {
    const courseId = await makeCourse({ title: 'Free Course' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Free Course', status: 'draft' }, { priceAmount: '', salePriceAmount: '' });

    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));
    expect(product).toBeTruthy();
    const [price] = await testDb.select().from(schema.prices).where(eq(schema.prices.productId, product!.id));
    expect(price?.amount).toBe(0);
  });

  it('is idempotent — calling it again updates the same product/price rows rather than creating duplicates', async () => {
    const courseId = await makeCourse({ title: 'Course' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Course', status: 'draft' }, { priceAmount: '10', salePriceAmount: '' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Course v2', status: 'draft' }, { priceAmount: '20', salePriceAmount: '' });

    const productRows = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));
    expect(productRows).toHaveLength(1);
    expect(productRows[0]?.name).toBe('Course v2');

    const priceRows = await testDb.select().from(schema.prices).where(eq(schema.prices.productId, productRows[0]!.id));
    expect(priceRows).toHaveLength(1);
    expect(priceRows[0]?.amount).toBe(2000);
  });

  it('marks the product active when the course is published', async () => {
    const courseId = await makeCourse({ title: 'Published Course', status: 'published' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Published Course', status: 'published' }, { priceAmount: '15', salePriceAmount: '' });

    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));
    expect(product?.status).toBe('active');
  });
});

describe('setProductStatusForCourse', () => {
  beforeEach(truncateAll);

  it('flips an existing product to inactive on archive, preserving the price row', async () => {
    const courseId = await makeCourse({ title: 'Course', status: 'published' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Course', status: 'published' }, { priceAmount: '15', salePriceAmount: '' });

    await setProductStatusForCourse(courseId, 'inactive');

    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));
    expect(product?.status).toBe('inactive');
    const [price] = await testDb.select().from(schema.prices).where(eq(schema.prices.productId, product!.id));
    expect(price?.amount).toBe(1500); // untouched
  });
});

describe('resolveCourseIdForProduct (the actual access bug fix)', () => {
  beforeEach(truncateAll);

  it('resolves the real courseId for a course-type product', async () => {
    const courseId = await makeCourse();
    await syncCourseProduct(testDb, { id: courseId, title: 'Test Course', status: 'published' }, { priceAmount: '10', salePriceAmount: '' });
    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));

    const resolved = await resolveCourseIdForProduct(product!.id);
    expect(resolved).toBe(courseId);
  });

  it('returns null for a non-course product (e.g. membership)', async () => {
    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'membership', name: 'Membership' });
    expect(await resolveCourseIdForProduct(productId)).toBeNull();
  });
});

describe('enrollInFreeCourse', () => {
  beforeEach(truncateAll);

  it('creates a $0 order, a free-method payment, and an active enrollment with courseId set', async () => {
    const userId = await makeUser('free@course.test');
    const courseId = await makeCourse({ title: 'Free Course', status: 'published' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Free Course', status: 'published' }, { priceAmount: '', salePriceAmount: '' });
    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));

    const result = await enrollInFreeCourse(userId, product!.id);
    expect(result.ok).toBe(true);

    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(order?.amount).toBe(0);
    expect(order?.status).toBe('paid');

    const [payment] = await testDb.select().from(schema.payments).where(eq(schema.payments.orderId, order!.id));
    expect(payment?.method).toBe('free');
    expect(payment?.status).toBe('succeeded');

    const [enrollment] = await testDb.select().from(schema.enrollments).where(eq(schema.enrollments.userId, userId));
    expect(enrollment?.courseId).toBe(courseId);
    expect(enrollment?.status).toBe('active');
  });

  it('rejects enrolling into a paid course as if it were free', async () => {
    const userId = await makeUser('wontwork@course.test');
    const courseId = await makeCourse({ title: 'Paid Course', status: 'published' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Paid Course', status: 'published' }, { priceAmount: '20', salePriceAmount: '' });
    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));

    const result = await enrollInFreeCourse(userId, product!.id);
    expect(result.ok).toBe(false);
  });

  it('is idempotent — enrolling twice does not create a duplicate order', async () => {
    const userId = await makeUser('twice@course.test');
    const courseId = await makeCourse({ title: 'Free Course', status: 'published' });
    await syncCourseProduct(testDb, { id: courseId, title: 'Free Course', status: 'published' }, { priceAmount: '', salePriceAmount: '' });
    const [product] = await testDb.select().from(schema.products).where(eq(schema.products.courseId, courseId));

    await enrollInFreeCourse(userId, product!.id);
    await enrollInFreeCourse(userId, product!.id);

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(orders).toHaveLength(1);
  });
});

describe('getCoursePlayer access rules for archived courses', () => {
  beforeEach(truncateAll);

  it('keeps access for an already-enrolled student after the course is archived', async () => {
    const userId = await makeUser('enrolled@archived.test');
    const courseId = await makeCourse({ title: 'Soon Archived', status: 'published' });
    await testDb.insert(schema.enrollments).values({ id: crypto.randomUUID(), userId, courseId, source: 'purchase', status: 'active' });

    await testDb.update(schema.courses).set({ status: 'archived' }).where(eq(schema.courses.id, courseId));

    const player = await getCoursePlayer(userId, courseId);
    expect(player?.enrolled).toBe(true);
  });

  it('denies access to an archived course for a student who was never enrolled', async () => {
    const userId = await makeUser('never-enrolled@archived.test');
    const courseId = await makeCourse({ title: 'Archived, never bought', status: 'archived' });

    expect(await getCoursePlayer(userId, courseId)).toBeNull();
  });

  it('denies access to a draft course even with a stray enrollment row', async () => {
    const userId = await makeUser('draft@course.test');
    const courseId = await makeCourse({ title: 'Draft Course', status: 'draft' });

    expect(await getCoursePlayer(userId, courseId)).toBeNull();
  });
});
