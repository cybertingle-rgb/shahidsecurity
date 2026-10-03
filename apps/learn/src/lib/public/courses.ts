import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { courses, instructors, products, prices, courseModules, lessons, enrollments } from '@/db/schema';
import { BASE_CURRENCY } from '@/lib/currency';

export type PublicCourseCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  level: string;
  featured: boolean;
  instructorName: string | null;
  moduleCount: number;
  lessonCount: number;
  productId: string | null;
  priceAmount: number | null;
  saleAmount: number | null;
  currencyCode: string;
};

/**
 * The real, dynamic catalog data — every card on the homepage, /courses,
 * and course detail pages comes from here, never a hardcoded list. Only
 * published courses; price comes from the course's own linked product
 * (syncCourseProduct keeps them in lockstep), so a course and its price
 * can never show two different numbers in two different places.
 */
async function listPublishedCoursesWithPricing(): Promise<PublicCourseCard[]> {
  const rows = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      thumbnailUrl: courses.thumbnailUrl,
      category: courses.category,
      level: courses.level,
      featured: courses.featured,
      instructorName: instructors.displayName,
      productId: products.id,
      priceAmount: prices.amount,
      saleAmount: prices.saleAmount,
      currencyCode: prices.currencyCode,
    })
    .from(courses)
    .leftJoin(instructors, eq(courses.instructorId, instructors.id))
    .leftJoin(products, eq(products.courseId, courses.id))
    .leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.currencyCode, BASE_CURRENCY), isNull(prices.countryCode)))
    .where(eq(courses.status, 'published'));

  if (rows.length === 0) return [];

  // One batched count query for every course's modules+lessons instead of
  // one query per course card (the same N+1 pitfall lib/checkout.ts's
  // listPurchasableProducts comment already calls out elsewhere).
  const courseIds = rows.map((r) => r.id);
  const moduleRows = await db.select({ id: courseModules.id, courseId: courseModules.courseId }).from(courseModules).where(inArray(courseModules.courseId, courseIds));
  const moduleIdsByCourse = new Map<string, string[]>();
  for (const m of moduleRows) {
    moduleIdsByCourse.set(m.courseId, [...(moduleIdsByCourse.get(m.courseId) ?? []), m.id]);
  }
  const allModuleIds = moduleRows.map((m) => m.id);
  const lessonCounts = allModuleIds.length
    ? await db.select({ moduleId: lessons.moduleId, count: sql<number>`count(*)` }).from(lessons).where(inArray(lessons.moduleId, allModuleIds)).groupBy(lessons.moduleId)
    : [];
  const lessonCountByModule = new Map(lessonCounts.map((l) => [l.moduleId, Number(l.count)]));

  return rows.map((r) => {
    const moduleIds = moduleIdsByCourse.get(r.id) ?? [];
    const lessonCount = moduleIds.reduce((sum, mid) => sum + (lessonCountByModule.get(mid) ?? 0), 0);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      shortDescription: r.shortDescription,
      thumbnailUrl: r.thumbnailUrl,
      category: r.category,
      level: r.level,
      featured: r.featured,
      instructorName: r.instructorName,
      moduleCount: moduleIds.length,
      lessonCount,
      productId: r.productId,
      priceAmount: r.priceAmount,
      saleAmount: r.saleAmount,
      currencyCode: r.currencyCode ?? BASE_CURRENCY,
    };
  });
}

export async function listCatalogCourses(): Promise<PublicCourseCard[]> {
  return listPublishedCoursesWithPricing();
}

/** Distinct categories actually in use by published courses — never a hardcoded list, per the "no demonstration data" rule. */
export async function listCourseCategories(): Promise<string[]> {
  const rows = await db.selectDistinct({ category: courses.category }).from(courses).where(eq(courses.status, 'published'));
  return rows.map((r) => r.category).filter((c): c is string => !!c);
}

export type PublicCourseDetail = PublicCourseCard & {
  fullDescription: string | null;
  learningOutcomes: string[];
  requirements: string[];
  targetAudience: string | null;
  productId: string | null;
  modules: { id: string; title: string; lessonTitles: string[] }[];
};

export async function getPublicCourseBySlug(slug: string): Promise<PublicCourseDetail | null> {
  const [row] = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      shortDescription: courses.shortDescription,
      fullDescription: courses.fullDescription,
      thumbnailUrl: courses.thumbnailUrl,
      category: courses.category,
      level: courses.level,
      featured: courses.featured,
      learningOutcomes: courses.learningOutcomes,
      requirements: courses.requirements,
      targetAudience: courses.targetAudience,
      instructorName: instructors.displayName,
      productId: products.id,
      priceAmount: prices.amount,
      saleAmount: prices.saleAmount,
      currencyCode: prices.currencyCode,
    })
    .from(courses)
    .leftJoin(instructors, eq(courses.instructorId, instructors.id))
    .leftJoin(products, eq(products.courseId, courses.id))
    .leftJoin(prices, and(eq(prices.productId, products.id), eq(prices.currencyCode, BASE_CURRENCY), isNull(prices.countryCode)))
    .where(and(eq(courses.slug, slug), eq(courses.status, 'published')));

  if (!row) return null;

  const moduleRows = await db.select().from(courseModules).where(eq(courseModules.courseId, row.id)).orderBy(courseModules.sortOrder);
  const moduleIds = moduleRows.map((m) => m.id);
  const lessonRows = moduleIds.length ? await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds)).orderBy(lessons.sortOrder) : [];

  return {
    ...row,
    learningOutcomes: row.learningOutcomes ?? [],
    requirements: row.requirements ?? [],
    moduleCount: moduleRows.length,
    lessonCount: lessonRows.length,
    currencyCode: row.currencyCode ?? BASE_CURRENCY,
    modules: moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      lessonTitles: lessonRows.filter((l) => l.moduleId === m.id).map((l) => l.title),
    })),
  };
}

export type CourseAccessState = 'guest' | 'owned' | 'purchasable' | 'enrollable_free';

/**
 * Drives the one CTA button shown on the homepage card, catalog card, and
 * detail page — computed in exactly one place so a course can never show
 * "Buy" in one spot and "Continue Learning" in another for the same
 * visitor. Server-side only: never trusts a client-held "I own this"
 * flag, matching lib/security's IDOR-safe pattern used everywhere else.
 */
export async function getCourseAccessState(userId: string | null, courseId: string): Promise<CourseAccessState> {
  if (!userId) return 'guest';

  const [owned] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), eq(enrollments.status, 'active')));
  if (owned) return 'owned';

  const [priceRow] = await db
    .select({ amount: prices.amount })
    .from(products)
    .innerJoin(prices, and(eq(prices.productId, products.id), eq(prices.currencyCode, BASE_CURRENCY), isNull(prices.countryCode)))
    .where(eq(products.courseId, courseId));

  return priceRow && priceRow.amount === 0 ? 'enrollable_free' : 'purchasable';
}

/**
 * The homepage and full catalog each render a whole page of cards at
 * once — calling getCourseAccessState per card would be a real N+1 (two
 * queries per course, same mistake lib/checkout.ts's listPurchasableProducts
 * comment already calls out and fixes for pricing). One batched enrollment
 * query covers every course on the page; the price side needs no query at
 * all, since listCatalogCourses already carried priceAmount on each card.
 */
export async function getCourseAccessStates(userId: string | null, courses: PublicCourseCard[]): Promise<Map<string, CourseAccessState>> {
  const result = new Map<string, CourseAccessState>();
  if (!userId) {
    for (const c of courses) result.set(c.id, 'guest');
    return result;
  }

  const courseIds = courses.map((c) => c.id);
  const ownedRows = courseIds.length
    ? await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, courseIds), eq(enrollments.status, 'active')))
    : [];
  const ownedCourseIds = new Set(ownedRows.map((r) => r.courseId));

  for (const c of courses) {
    result.set(c.id, ownedCourseIds.has(c.id) ? 'owned' : c.priceAmount === 0 ? 'enrollable_free' : 'purchasable');
  }
  return result;
}
