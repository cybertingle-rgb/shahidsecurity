import { eq, asc, desc, inArray, isNull } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
import { BASE_CURRENCY } from '@/lib/learn/currency';
const { courses, instructors, courseModules, lessons, lessonVideoSources, quizzes, quizQuestions, assignments, products, prices } = learnSchema;

export class CoursePriceError extends Error {}

/** Accepts either the shared `db` or a transaction handle from `db.transaction()` — the same query-builder surface either way. */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Validates and converts the course form's plain-money price fields
 * (e.g. "29.99") into minor units, enforcing the one rule that matters
 * here: a discounted price can never exceed the regular price. A blank or
 * zero price is a valid, deliberate choice — "this course is free" — not
 * an error, and resolves to amount: 0 rather than no price at all, so a
 * free course still has a real product+price row for self-enrollment to
 * go through the same order/payment workflow a paid purchase does (see
 * enrollInFreeCourse in lib/checkout.ts).
 */
export function parseCoursePriceInput(priceInput: string, salePriceInput: string): { amount: number; saleAmount: number | null } {
  const priceMajor = priceInput.trim() === '' ? 0 : Number(priceInput);
  if (!Number.isFinite(priceMajor) || priceMajor < 0) throw new CoursePriceError('Price must be a positive number.');
  const amount = Math.round(priceMajor * 100);
  if (amount === 0) return { amount: 0, saleAmount: null };

  const saleMajorRaw = salePriceInput.trim();
  if (saleMajorRaw === '') return { amount, saleAmount: null };

  const saleMajor = Number(saleMajorRaw);
  if (!Number.isFinite(saleMajor) || saleMajor < 0) throw new CoursePriceError('Discounted price must be a positive number.');
  const saleAmount = Math.round(saleMajor * 100);
  if (saleAmount >= amount) throw new CoursePriceError('Discounted price must be lower than the regular price.');

  return { amount, saleAmount };
}

export async function listCourses() {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
      level: courses.level,
      instructorName: instructors.displayName,
      updatedAt: courses.updatedAt,
    })
    .from(courses)
    .leftJoin(instructors, eq(courses.instructorId, instructors.id))
    .orderBy(desc(courses.updatedAt));
}

export async function getCourse(id: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, id));
  return course ?? null;
}

/** The course form's own price fields, read back from the auto-managed linked product — never a second, separately-edited record. */
export async function getCourseProductAndPrice(courseId: string) {
  const [product] = await db.select().from(products).where(eq(products.courseId, courseId));
  if (!product) return null;
  const [price] = await db.select().from(prices).where(eq(prices.productId, product.id));
  return { product, price: price ?? null };
}

/**
 * The one place a course's price lives, and the one place that ever
 * writes to the `products`/`prices` tables on a course's behalf — there is
 * no separate admin screen for a course-type product. Every course gets
 * exactly one linked product (one-to-one, enforced by a unique index on
 * products.courseId), whether paid or free — a free course just has a
 * price row with amount: 0, so self-enrollment can go through the same
 * order/payment workflow a real purchase does (lib/checkout.ts's
 * enrollInFreeCourse) instead of a separate ad-hoc path. Never deletes a
 * product or price row once created: going from paid to free, or
 * archiving the course, only ever updates status/amount in place, so a
 * past purchaser's order/payment history is never orphaned.
 *
 * Call this inside the same transaction as the course insert/update.
 */
export async function syncCourseProduct(
  tx: DbOrTx,
  course: { id: string; title: string; status: 'draft' | 'review' | 'published' | 'archived' },
  priceInput: { priceAmount: string; salePriceAmount: string },
) {
  const parsed = parseCoursePriceInput(priceInput.priceAmount, priceInput.salePriceAmount);
  const [existingProduct] = await tx.select().from(products).where(eq(products.courseId, course.id));

  const productStatus = course.status === 'published' ? 'active' : 'inactive';
  const productId = existingProduct?.id ?? crypto.randomUUID();

  if (existingProduct) {
    await tx.update(products).set({ name: course.title, status: productStatus, updatedAt: new Date() }).where(eq(products.id, productId));
  } else {
    await tx.insert(products).values({ id: productId, type: 'course', courseId: course.id, name: course.title, status: productStatus });
  }

  const [existingPrice] = await tx.select().from(prices).where(eq(prices.productId, productId));
  if (existingPrice) {
    await tx.update(prices).set({ amount: parsed.amount, saleAmount: parsed.saleAmount, isActive: true }).where(eq(prices.id, existingPrice.id));
  } else {
    await tx.insert(prices).values({
      id: crypto.randomUUID(),
      productId,
      currencyCode: BASE_CURRENCY,
      countryCode: null,
      amount: parsed.amount,
      saleAmount: parsed.saleAmount,
      isActive: true,
    });
  }
}

/**
 * Every course needs an instructor shown to students, but there's no admin
 * UI to create instructor profiles (V1 scope) and a fresh database starts
 * with zero rows in `instructors` — so the picker had nothing to offer and
 * courses were left instructor-less. Self-heals instead of needing a
 * migration or shell access on Hostinger: finds-or-creates a single real
 * "Shahid Iqbal" profile (the actual founder, not a placeholder) and
 * backfills any course left without one onto it. Cheap and idempotent, so
 * it's safe to call on every admin courses page load.
 */
export async function ensureDefaultInstructor() {
  const [existing] = await db.select({ id: instructors.id }).from(instructors).where(eq(instructors.displayName, 'Shahid Iqbal'));
  const id = existing?.id ?? crypto.randomUUID();

  if (!existing) {
    await db.insert(instructors).values({
      id,
      displayName: 'Shahid Iqbal',
      bio: 'Founder of Shahid Security and Learn with Shahid — a working cybersecurity consultant with hands-on SOC analyst and incident-response experience.',
      credentialsText: 'CEH-trained · CISSP-domain training · SOC & incident-response experience since 2020',
    });
  }

  await db.update(courses).set({ instructorId: id }).where(isNull(courses.instructorId));

  return id;
}

/** Flips a course's linked product (if one exists — free courses have none) between purchasable and not, without touching its price. Used by publish/archive/draft transitions. */
export async function setProductStatusForCourse(courseId: string, productStatus: 'active' | 'inactive') {
  await db.update(products).set({ status: productStatus, updatedAt: new Date() }).where(eq(products.courseId, courseId));
}

export async function listInstructors() {
  await ensureDefaultInstructor();
  return db.select({ id: instructors.id, displayName: instructors.displayName }).from(instructors);
}

/** Modules with their lessons nested, ordered for the admin course-editor page. */
export async function listModulesWithLessons(courseId: string) {
  const moduleRows = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.sortOrder));
  if (moduleRows.length === 0) return [];

  const moduleIds = moduleRows.map((m) => m.id);
  const lessonRows = await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds)).orderBy(asc(lessons.sortOrder));

  return moduleRows.map((m) => ({
    ...m,
    lessons: lessonRows.filter((l) => l.moduleId === m.id),
  }));
}

export async function getLesson(id: string) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, id));
  return lesson ?? null;
}

export async function getLessonVideoSource(lessonId: string) {
  const [row] = await db.select().from(lessonVideoSources).where(eq(lessonVideoSources.lessonId, lessonId));
  return row ?? null;
}

export async function getAssignment(lessonId: string) {
  const [row] = await db.select().from(assignments).where(eq(assignments.lessonId, lessonId));
  return row ?? null;
}

export async function getQuizWithQuestions(lessonId: string) {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId));
  if (!quiz) return null;
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id)).orderBy(asc(quizQuestions.sortOrder));
  return { ...quiz, questions };
}

/** The course a lesson belongs to, walking lesson -> module -> course — used by both admin breadcrumbs and student-player IDOR checks. */
export async function getCourseIdForLesson(lessonId: string) {
  const [row] = await db
    .select({ courseId: courseModules.courseId })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .where(eq(lessons.id, lessonId));
  return row?.courseId ?? null;
}
