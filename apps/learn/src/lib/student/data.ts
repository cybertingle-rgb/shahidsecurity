import { eq, and, asc, inArray, desc } from 'drizzle-orm';
import { db } from '@/db';
import {
  enrollments,
  courses,
  courseModules,
  lessons,
  lessonVideoSources,
  lessonProgress,
  courseProgress,
  quizzes,
  quizQuestions,
  quizAttempts,
  products,
  memberships,
  communities,
  communityAccess,
  orders,
  users,
} from '@/db/schema';

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

// --- Course player -----------------------------------------------------
// The IDOR-safe rule here is stricter than the read-only dashboard pages
// above: a lesson's *content* (video source, quiz questions/answers,
// assignment instructions) is only ever returned once the caller is
// confirmed enrolled in that lesson's course, OR the lesson is flagged
// `isFreePreview` — there is no third path, per docs/lms-security.md's
// "a student cannot access an unpaid course" negative test.

async function getActiveEnrollment(userId: string, courseId: string) {
  const [row] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId), eq(enrollments.status, 'active')));
  return row ?? null;
}

export async function getCoursePlayer(userId: string, courseId: string) {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId));
  if (!course) return null;

  const enrollment = await getActiveEnrollment(userId, courseId);
  const enrolled = !!enrollment;

  // 'published' is the only status a *new* enrollment can come from — but
  // archiving a course must never take away access a student already paid
  // for (Part 2/6's "preserve purchase history and access" rule). Draft and
  // review, on the other hand, never had a real enrollment behind them
  // (nothing purchasable existed yet), so there's nothing to preserve.
  if (course.status !== 'published' && course.status !== 'archived') return null;
  if (course.status === 'archived' && !enrolled) return null;

  const moduleRows = await db.select().from(courseModules).where(eq(courseModules.courseId, courseId)).orderBy(asc(courseModules.sortOrder));
  const moduleIds = moduleRows.map((m) => m.id);
  const lessonRows = moduleIds.length
    ? await db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds)).orderBy(asc(lessons.sortOrder))
    : [];

  let progressByLessonId = new Map<string, string>();
  if (enrollment) {
    const progressRows = await db
      .select({ lessonId: lessonProgress.lessonId, status: lessonProgress.status })
      .from(lessonProgress)
      .where(eq(lessonProgress.enrollmentId, enrollment.id));
    progressByLessonId = new Map(progressRows.map((r) => [r.lessonId, r.status]));
  }

  return {
    course,
    enrolled,
    modules: moduleRows.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: lessonRows
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          type: l.type,
          isFreePreview: l.isFreePreview,
          locked: !enrolled && !l.isFreePreview,
          progressStatus: progressByLessonId.get(l.id) ?? 'not_started',
        })),
    })),
  };
}

type QuizForPlayer = {
  id: string;
  passingPercentage: number;
  maxAttempts: number | null;
  attemptsUsed: number;
  questions: { id: string; type: string; prompt: string; options: string[] | null }[];
};

type LessonForPlayer =
  | { locked: true; courseId: string }
  | {
      locked: false;
      courseId: string;
      courseTitle: string;
      lesson: { id: string; title: string; type: string; content: Record<string, unknown> | null };
      videoSource: { provider: string; providerReference: string } | null;
      quiz: QuizForPlayer | null;
      progressStatus: string;
    };

export async function getLessonForPlayer(userId: string, lessonId: string): Promise<LessonForPlayer | null> {
  const rows = await db
    .select({ lesson: lessons, courseId: courses.id, courseTitle: courses.title })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(lessons.id, lessonId));
  const row = rows[0];
  if (!row) return null;

  const enrollment = await getActiveEnrollment(userId, row.courseId);
  if (!enrollment && !row.lesson.isFreePreview) {
    return { locked: true, courseId: row.courseId };
  }

  const [videoSource, quizRow, progressRow] = await Promise.all([
    row.lesson.type === 'video' ? db.select().from(lessonVideoSources).where(eq(lessonVideoSources.lessonId, lessonId)).then((r) => r[0] ?? null) : null,
    row.lesson.type === 'quiz' ? db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).then((r) => r[0] ?? null) : null,
    enrollment
      ? db
          .select({ status: lessonProgress.status })
          .from(lessonProgress)
          .where(and(eq(lessonProgress.enrollmentId, enrollment.id), eq(lessonProgress.lessonId, lessonId)))
          .then((r) => r[0] ?? null)
      : null,
  ]);

  let quiz: QuizForPlayer | null = null;
  if (quizRow) {
    const questionRows = await db
      .select({ id: quizQuestions.id, type: quizQuestions.type, prompt: quizQuestions.prompt, options: quizQuestions.options })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizRow.id))
      .orderBy(asc(quizQuestions.sortOrder));
    const attemptsUsed = enrollment
      ? (await db.select({ id: quizAttempts.id }).from(quizAttempts).where(and(eq(quizAttempts.quizId, quizRow.id), eq(quizAttempts.enrollmentId, enrollment.id)))).length
      : 0;
    quiz = {
      id: quizRow.id,
      passingPercentage: quizRow.passingPercentage,
      maxAttempts: quizRow.maxAttempts,
      attemptsUsed,
      // correctAnswer is deliberately never selected here — it only ever
      // reaches the server-side grader in submitQuizAttempt below.
      questions: questionRows,
    };
  }

  return {
    locked: false,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    lesson: { id: row.lesson.id, title: row.lesson.title, type: row.lesson.type, content: row.lesson.content },
    videoSource: videoSource ? { provider: videoSource.provider, providerReference: videoSource.providerReference } : null,
    quiz,
    progressStatus: progressRow?.status ?? 'not_started',
  };
}

async function recomputeCourseProgress(enrollmentId: string, courseId: string, lastLessonId: string) {
  const moduleRows = await db.select({ id: courseModules.id }).from(courseModules).where(eq(courseModules.courseId, courseId));
  const moduleIds = moduleRows.map((m) => m.id);
  const totalLessons = moduleIds.length ? (await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, moduleIds))).length : 0;
  const completedLessons = (
    await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.enrollmentId, enrollmentId), eq(lessonProgress.status, 'completed')))
  ).length;

  const percentComplete = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const [existing] = await db.select({ id: courseProgress.id }).from(courseProgress).where(eq(courseProgress.enrollmentId, enrollmentId));
  if (existing) {
    await db.update(courseProgress).set({ percentComplete, lastLessonId, updatedAt: new Date() }).where(eq(courseProgress.id, existing.id));
  } else {
    await db.insert(courseProgress).values({ id: crypto.randomUUID(), enrollmentId, percentComplete, lastLessonId });
  }
}

export async function markLessonComplete(userId: string, lessonId: string): Promise<{ ok: boolean }> {
  const courseId = await db
    .select({ courseId: courses.id })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .then((r) => r[0]?.courseId ?? null);
  if (!courseId) return { ok: false };

  const enrollment = await getActiveEnrollment(userId, courseId);
  if (!enrollment) return { ok: false }; // free-preview lessons don't track progress — there's no enrollment to attach it to

  const [existing] = await db
    .select({ id: lessonProgress.id })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.enrollmentId, enrollment.id), eq(lessonProgress.lessonId, lessonId)));
  if (existing) {
    await db.update(lessonProgress).set({ status: 'completed', completedAt: new Date() }).where(eq(lessonProgress.id, existing.id));
  } else {
    await db.insert(lessonProgress).values({
      id: crypto.randomUUID(),
      enrollmentId: enrollment.id,
      lessonId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
    });
  }

  await recomputeCourseProgress(enrollment.id, courseId, lessonId);
  return { ok: true };
}

function gradeQuestion(question: { type: string; correctAnswer: unknown }, answer: unknown): boolean {
  switch (question.type) {
    case 'multiple_choice':
    case 'short_answer':
      return String(answer ?? '').trim().toLowerCase() === String(question.correctAnswer ?? '').trim().toLowerCase();
    case 'true_false':
      return Boolean(answer) === Boolean(question.correctAnswer);
    case 'multiple_answer': {
      const given = Array.isArray(answer) ? answer.map((a) => String(a).trim()).sort() : [];
      const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer.map((a) => String(a).trim()).sort() : [];
      return given.length === correct.length && given.every((v, i) => v === correct[i]);
    }
    default:
      return false;
  }
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; scorePercentage?: number; passed?: boolean; showAnswers?: boolean }> {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
  if (!quiz) return { ok: false, error: 'Quiz not found.' };

  const courseId = await db
    .select({ courseId: courses.id })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(lessons.id, quiz.lessonId))
    .then((r) => r[0]?.courseId ?? null);
  if (!courseId) return { ok: false, error: 'Course not found.' };

  const enrollment = await getActiveEnrollment(userId, courseId);
  if (!enrollment) return { ok: false, error: 'Not enrolled in this course.' };

  if (quiz.maxAttempts != null) {
    const attemptsUsed = (
      await db.select({ id: quizAttempts.id }).from(quizAttempts).where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.enrollmentId, enrollment.id)))
    ).length;
    if (attemptsUsed >= quiz.maxAttempts) return { ok: false, error: 'No attempts remaining.' };
  }

  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
  const correctCount = questions.filter((q) => gradeQuestion(q, answers[q.id])).length;
  const scorePercentage = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const passed = scorePercentage >= quiz.passingPercentage;

  await db.insert(quizAttempts).values({
    id: crypto.randomUUID(),
    quizId,
    enrollmentId: enrollment.id,
    answers,
    scorePercentage,
    passed,
    submittedAt: new Date(),
  });

  if (passed) {
    await markLessonComplete(userId, quiz.lessonId);
  }

  return { ok: true, scorePercentage, passed, showAnswers: quiz.showAnswersAfterSubmit };
}
