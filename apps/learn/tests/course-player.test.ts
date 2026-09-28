import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { getCoursePlayer, getLessonForPlayer, markLessonComplete, submitQuizAttempt } from '@/lib/student/data';

/**
 * Phase 5's negative tests, matching student-idor.test.ts's pattern: every
 * function here takes only a userId, and the one thing that must never
 * happen is a non-enrolled student reaching a paid course's real content —
 * the "a student cannot access an unpaid course" case the project brief
 * calls out by name (docs/LMS_IMPLEMENTATION_PLAN.md's testing scope).
 */

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, countryCode: 'PK' });
  return { id, email };
}

async function makeCourseWithLesson(opts: { freePreview?: boolean; lessonType?: 'text' | 'quiz' } = {}) {
  const courseId = crypto.randomUUID();
  await testDb.insert(schema.courses).values({ id: courseId, title: 'Test course', slug: `test-course-${courseId.slice(0, 8)}`, status: 'published' });

  const moduleId = crypto.randomUUID();
  await testDb.insert(schema.courseModules).values({ id: moduleId, courseId, title: 'Module 1', sortOrder: 0 });

  const lessonId = crypto.randomUUID();
  await testDb.insert(schema.lessons).values({
    id: lessonId,
    moduleId,
    title: 'Lesson 1',
    type: opts.lessonType ?? 'text',
    content: opts.lessonType === 'quiz' ? null : { body: 'secret paid content' },
    isFreePreview: opts.freePreview ?? false,
    sortOrder: 0,
  });

  return { courseId, moduleId, lessonId };
}

async function enroll(userId: string, courseId: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.enrollments).values({ id, userId, courseId, status: 'active', source: 'manual_admin_grant' });
  return id;
}

afterAll(closeTestDb);

describe('Course player — enrollment-gated access', () => {
  beforeEach(truncateAll);

  it('getCoursePlayer marks non-free lessons as locked for a non-enrolled student', async () => {
    const student = await makeUser('student.notenrolled@player.test');
    const { courseId } = await makeCourseWithLesson({ freePreview: false });

    const data = await getCoursePlayer(student.id, courseId);
    expect(data?.enrolled).toBe(false);
    expect(data?.modules[0]?.lessons[0]?.locked).toBe(true);
  });

  it('getCoursePlayer unlocks every lesson for an enrolled student', async () => {
    const student = await makeUser('student.enrolled@player.test');
    const { courseId } = await makeCourseWithLesson({ freePreview: false });
    await enroll(student.id, courseId);

    const data = await getCoursePlayer(student.id, courseId);
    expect(data?.enrolled).toBe(true);
    expect(data?.modules[0]?.lessons[0]?.locked).toBe(false);
  });

  it('getLessonForPlayer refuses lesson content to a non-enrolled student on a non-preview lesson', async () => {
    const student = await makeUser('student.locked@player.test');
    const { lessonId } = await makeCourseWithLesson({ freePreview: false });

    const result = await getLessonForPlayer(student.id, lessonId);
    expect(result?.locked).toBe(true);
    // TypeScript narrows this away when locked, but the whole point of the
    // test is verifying the *runtime* value never carries content when locked.
    expect((result as { lesson?: unknown })?.lesson).toBeUndefined();
  });

  it('getLessonForPlayer returns content for a free-preview lesson even without enrollment', async () => {
    const student = await makeUser('student.preview@player.test');
    const { lessonId } = await makeCourseWithLesson({ freePreview: true });

    const result = await getLessonForPlayer(student.id, lessonId);
    expect(result?.locked).toBe(false);
    if (!result?.locked) expect(result?.lesson.title).toBe('Lesson 1');
  });

  it('markLessonComplete is a no-op for a non-enrolled student (no progress row created)', async () => {
    const student = await makeUser('student.noprogress@player.test');
    const { lessonId } = await makeCourseWithLesson({ freePreview: true });

    const result = await markLessonComplete(student.id, lessonId);
    expect(result.ok).toBe(false);

    const rows = await testDb.select().from(schema.lessonProgress);
    expect(rows).toHaveLength(0);
  });

  it('markLessonComplete recomputes course_progress percentage for an enrolled student', async () => {
    const student = await makeUser('student.progress@player.test');
    const { courseId, lessonId } = await makeCourseWithLesson({ freePreview: false });
    await enroll(student.id, courseId);

    const result = await markLessonComplete(student.id, lessonId);
    expect(result.ok).toBe(true);

    const [progress] = await testDb.select().from(schema.courseProgress);
    expect(progress?.percentComplete).toBe(100); // the only lesson in the course, now completed
  });

  it('submitQuizAttempt refuses to grade for a non-enrolled student', async () => {
    const student = await makeUser('student.noquiz@player.test');
    const { lessonId } = await makeCourseWithLesson({ lessonType: 'quiz' });
    const quizId = crypto.randomUUID();
    await testDb.insert(schema.quizzes).values({ id: quizId, lessonId, passingPercentage: 70 });

    const result = await submitQuizAttempt(student.id, quizId, {});
    expect(result.ok).toBe(false);

    const attempts = await testDb.select().from(schema.quizAttempts);
    expect(attempts).toHaveLength(0);
  });

  it('submitQuizAttempt grades server-side from the stored correct answer, ignoring any client-submitted score', async () => {
    const student = await makeUser('student.quiz@player.test');
    const { courseId, lessonId } = await makeCourseWithLesson({ lessonType: 'quiz' });
    await enroll(student.id, courseId);

    const quizId = crypto.randomUUID();
    await testDb.insert(schema.quizzes).values({ id: quizId, lessonId, passingPercentage: 70 });
    const questionId = crypto.randomUUID();
    await testDb.insert(schema.quizQuestions).values({
      id: questionId,
      quizId,
      type: 'multiple_choice',
      prompt: 'What is 2+2?',
      options: ['3', '4', '5'],
      correctAnswer: '4',
      sortOrder: 0,
    });

    const wrong = await submitQuizAttempt(student.id, quizId, { [questionId]: '3' });
    expect(wrong.passed).toBe(false);
    expect(wrong.scorePercentage).toBe(0);

    const right = await submitQuizAttempt(student.id, quizId, { [questionId]: '4' });
    expect(right.passed).toBe(true);
    expect(right.scorePercentage).toBe(100);
  });

  it('submitQuizAttempt enforces maxAttempts', async () => {
    const student = await makeUser('student.attempts@player.test');
    const { courseId, lessonId } = await makeCourseWithLesson({ lessonType: 'quiz' });
    await enroll(student.id, courseId);

    const quizId = crypto.randomUUID();
    await testDb.insert(schema.quizzes).values({ id: quizId, lessonId, passingPercentage: 70, maxAttempts: 1 });
    const questionId = crypto.randomUUID();
    await testDb.insert(schema.quizQuestions).values({ id: questionId, quizId, type: 'true_false', prompt: 'True?', correctAnswer: true, sortOrder: 0 });

    const first = await submitQuizAttempt(student.id, quizId, { [questionId]: true });
    expect(first.ok).toBe(true);

    const second = await submitQuizAttempt(student.id, quizId, { [questionId]: true });
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/no attempts remaining/i);
  });
});
