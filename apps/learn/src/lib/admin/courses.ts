import { eq, asc, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { courses, instructors, courseModules, lessons, lessonVideoSources, quizzes, quizQuestions, assignments } from '@/db/schema';

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
