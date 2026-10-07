import { eq, desc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { enrollments, users, courses, products } = learnSchema;

export async function listEnrollments() {
  return db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      source: enrollments.source,
      enrolledAt: enrollments.enrolledAt,
      studentId: users.id,
      studentName: users.fullName,
      studentEmail: users.email,
      courseTitle: courses.title,
      productName: products.name,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .leftJoin(courses, eq(enrollments.courseId, courses.id))
    .leftJoin(products, eq(enrollments.productId, products.id))
    .orderBy(desc(enrollments.enrolledAt))
    .limit(100);
}
