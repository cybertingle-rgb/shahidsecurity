import 'dotenv/config';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Read-only safety check, run before the `products.courseId` migration in
 * both environments (local now, production once access is confirmed) —
 * same script, same output shape, so "safe locally" and "safe in
 * production" mean the same thing. Never writes anything.
 *
 * What it checks, per the migration-safety requirement:
 * - How many products/courses/orders/payments/enrollments exist at all.
 * - Any `products` row of type='course' that would need a `courseId`
 *   backfilled (and whether a course with a matching title exists, as a
 *   *suggestion* only — never auto-applied).
 * - Orphaned data that would make the new unique index on
 *   `products.courseId` or the `enrollments.courseId` FK tightening
 *   (cascade -> restrict) unsafe to apply blindly.
 */
async function main() {
  const connectionString = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_ADMIN_URL or DATABASE_URL is not set.');

  const connection = await mysql.createConnection({ uri: connectionString });
  const db = drizzle(connection, { mode: 'default', schema });

  try {
    const [[counts]] = await connection.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM payments) AS payments,
        (SELECT COUNT(*) FROM enrollments) AS enrollments
    `);
    console.log('--- Row counts ---');
    console.table(counts);

    const courseProducts = await db.select({ id: schema.products.id, name: schema.products.name, status: schema.products.status }).from(schema.products).where(eq(schema.products.type, 'course'));
    console.log(`\n--- Existing products with type='course' (${courseProducts.length}) ---`);
    if (courseProducts.length > 0) {
      console.table(courseProducts);
      for (const p of courseProducts) {
        const matches = await db.select({ id: schema.courses.id, title: schema.courses.title }).from(schema.courses).where(eq(schema.courses.title, p.name));
        console.log(`  Product "${p.name}" (${p.id}): ${matches.length} course(s) with an exact matching title ->`, matches);
      }
    } else {
      console.log('  None. The new products.courseId column and unique index are safe to add with no backfill needed.');
    }

    const [orphanOrders] = await connection.query<RowDataPacket[]>(`
      SELECT o.id, o.order_number, o.product_id FROM orders o
      LEFT JOIN products p ON p.id = o.product_id
      WHERE p.id IS NULL
    `);
    console.log(`\n--- Orders referencing a missing product (${(orphanOrders as unknown[]).length}) ---`, orphanOrders);

    const [enrollmentsMissingBoth] = await connection.query<RowDataPacket[]>(`
      SELECT id, user_id, product_id, course_id FROM enrollments
      WHERE course_id IS NULL AND product_id IS NULL
    `);
    console.log(`\n--- Enrollments with neither courseId nor productId set (${(enrollmentsMissingBoth as unknown[]).length}) ---`, enrollmentsMissingBoth);

    const [courseTypeEnrollmentsMissingCourseId] = await connection.query<RowDataPacket[]>(`
      SELECT e.id AS enrollment_id, e.user_id, e.product_id, e.enrolled_at
      FROM enrollments e
      JOIN products p ON p.id = e.product_id
      WHERE p.type = 'course' AND e.course_id IS NULL
    `);
    console.log(
      `\n--- Enrollments for a course-type product with courseId NULL — i.e. paid for a course but no access (${(courseTypeEnrollmentsMissingCourseId as unknown[]).length}) ---`,
      courseTypeEnrollmentsMissingCourseId,
    );

    const [[cascadeCheck]] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM enrollments WHERE course_id IS NOT NULL`);
    console.log(
      `\n--- Enrollments currently pointing at a course (${(cascadeCheck as { n: number }).n}) — the cascade->restrict FK change on enrollments.courseId affects none of these unless a course is hard-deleted, which no code path does. ---`,
    );
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
