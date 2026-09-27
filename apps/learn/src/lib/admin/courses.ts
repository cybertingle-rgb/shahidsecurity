import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { courses, instructors } from '@/db/schema';

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

export async function listInstructors() {
  return db.select({ id: instructors.id, displayName: instructors.displayName }).from(instructors);
}
