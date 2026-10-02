'use server';

import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { courses, courseModules, lessons, lessonVideoSources, assignments, quizzes, quizQuestions } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { getCourseIdForLesson, ensureDefaultInstructor, syncCourseProduct, setProductStatusForCourse } from '@/lib/admin/courses';
import { isSafeThumbnailUrl } from '@/lib/thumbnails';

/** Splits a newline-separated textarea into a clean string array, dropping blank lines — the storage shape for learningOutcomes/requirements. */
function parseListField(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

type LessonType = 'video' | 'text' | 'pdf' | 'image' | 'code' | 'quiz' | 'assignment' | 'external_resource' | 'download';

type CourseStatus = 'draft' | 'review' | 'published' | 'archived';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createCourse(formData: FormData) {
  const admin = await requireAdminAction('courses.create');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');
  // Every course needs an instructor shown to students, so an admin who
  // leaves the picker on "—" still gets a real one rather than null.
  const instructorId = (formData.get('instructorId') as string) || (await ensureDefaultInstructor());
  const level = String(formData.get('level') ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert';
  const thumbnailUrlInput = String(formData.get('thumbnailUrl') ?? '').trim();
  if (thumbnailUrlInput && !isSafeThumbnailUrl(thumbnailUrlInput)) throw new Error('Thumbnail must be a valid https:// image URL.');

  const id = crypto.randomUUID();
  let slug = slugify(title);
  const [existing] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug));
  if (existing) slug = `${slug}-${id.slice(0, 8)}`;

  await db.transaction(async (tx) => {
    await tx.insert(courses).values({
      id,
      title,
      slug,
      shortDescription: String(formData.get('shortDescription') ?? '') || null,
      fullDescription: String(formData.get('fullDescription') ?? '') || null,
      thumbnailUrl: thumbnailUrlInput || null,
      instructorId,
      category: String(formData.get('category') ?? '').trim() || null,
      level,
      featured: formData.get('featured') === 'on',
      learningOutcomes: parseListField(formData.get('learningOutcomes')),
      requirements: parseListField(formData.get('requirements')),
      targetAudience: String(formData.get('targetAudience') ?? '').trim() || null,
      status: 'draft',
    });

    await syncCourseProduct(
      tx,
      { id, title, status: 'draft' },
      {
        priceAmount: String(formData.get('priceAmount') ?? ''),
        salePriceAmount: String(formData.get('salePriceAmount') ?? ''),
      },
    );
  });

  await logAudit({ actorUserId: admin.id, action: 'course.created', targetType: 'course', targetId: id, metadata: { title } });
  redirect(`/admin/courses/${id}`);
}

export async function updateCourse(id: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');
  const instructorId = (formData.get('instructorId') as string) || null;
  const level = String(formData.get('level') ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert';
  const thumbnailUrlInput = String(formData.get('thumbnailUrl') ?? '').trim();
  if (thumbnailUrlInput && !isSafeThumbnailUrl(thumbnailUrlInput)) throw new Error('Thumbnail must be a valid https:// image URL.');

  await db.transaction(async (tx) => {
    const [current] = await tx.select({ status: courses.status }).from(courses).where(eq(courses.id, id));
    if (!current) throw new Error('Course not found.');

    await tx
      .update(courses)
      .set({
        title,
        shortDescription: String(formData.get('shortDescription') ?? '') || null,
        fullDescription: String(formData.get('fullDescription') ?? '') || null,
        thumbnailUrl: thumbnailUrlInput || null,
        instructorId,
        category: String(formData.get('category') ?? '').trim() || null,
        level,
        featured: formData.get('featured') === 'on',
        learningOutcomes: parseListField(formData.get('learningOutcomes')),
        requirements: parseListField(formData.get('requirements')),
        targetAudience: String(formData.get('targetAudience') ?? '').trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id));

    await syncCourseProduct(
      tx,
      { id, title, status: current.status },
      {
        priceAmount: String(formData.get('priceAmount') ?? ''),
        salePriceAmount: String(formData.get('salePriceAmount') ?? ''),
      },
    );
  });

  await logAudit({ actorUserId: admin.id, action: 'course.updated', targetType: 'course', targetId: id });
  revalidatePath(`/admin/courses/${id}`);
}

export async function setCourseStatus(id: string, status: CourseStatus) {
  // Publishing specifically needs its own permission — a deliberate admin
  // action, never automatic — per docs/lms-admin-guide.md's content
  // workflow rule. Draft/review/archived transitions use the broader
  // courses.update permission.
  const admin = await requireAdminAction(status === 'published' ? 'courses.publish' : 'courses.update');

  await db
    .update(courses)
    .set({ status, publishedAt: status === 'published' ? new Date() : undefined, updatedAt: new Date() })
    .where(eq(courses.id, id));

  // Archiving/unpublishing removes the course from public purchasing;
  // publishing restores it — the linked product (if any; free courses
  // have none) is the only thing that controls purchasability, so it must
  // move in lockstep with the course's own status.
  await setProductStatusForCourse(id, status === 'published' ? 'active' : 'inactive');

  await logAudit({ actorUserId: admin.id, action: `course.status_changed.${status}`, targetType: 'course', targetId: id });
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
}

// --- Modules ---------------------------------------------------------

export async function createModule(courseId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');

  const [{ count } = { count: 0 }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(courseModules)
    .where(eq(courseModules.courseId, courseId));

  const id = crypto.randomUUID();
  await db.insert(courseModules).values({ id, courseId, title, sortOrder: Number(count) });

  await logAudit({ actorUserId: admin.id, action: 'course_module.created', targetType: 'course_module', targetId: id, metadata: { courseId } });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateModule(courseId: string, moduleId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');

  await db.update(courseModules).set({ title }).where(eq(courseModules.id, moduleId));
  await logAudit({ actorUserId: admin.id, action: 'course_module.updated', targetType: 'course_module', targetId: moduleId });
  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteModule(courseId: string, moduleId: string) {
  const admin = await requireAdminAction('courses.update');
  await db.delete(courseModules).where(eq(courseModules.id, moduleId));
  await logAudit({ actorUserId: admin.id, action: 'course_module.deleted', targetType: 'course_module', targetId: moduleId });
  revalidatePath(`/admin/courses/${courseId}`);
}

// --- Lessons ---------------------------------------------------------

export async function createLesson(courseId: string, moduleId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? 'text') as LessonType;
  if (!title) throw new Error('Title is required.');

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(lessons).where(eq(lessons.moduleId, moduleId));

  const id = crypto.randomUUID();
  await db.insert(lessons).values({
    id,
    moduleId,
    title,
    type,
    isFreePreview: formData.get('isFreePreview') === 'on',
    sortOrder: Number(count),
  });

  await logAudit({ actorUserId: admin.id, action: 'lesson.created', targetType: 'lesson', targetId: id, metadata: { courseId, moduleId, type } });
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}/lessons/${id}`);
}

export async function deleteLesson(courseId: string, lessonId: string) {
  const admin = await requireAdminAction('courses.update');
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  await logAudit({ actorUserId: admin.id, action: 'lesson.deleted', targetType: 'lesson', targetId: lessonId });
  revalidatePath(`/admin/courses/${courseId}`);
}

/** Handles every lesson type's content in one action — which fields matter depends on `type`, everything else is ignored. */
export async function updateLessonContent(lessonId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const courseId = await getCourseIdForLesson(lessonId);
  if (!courseId) throw new Error('Lesson not found.');

  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? 'text') as LessonType;
  const isFreePreview = formData.get('isFreePreview') === 'on';
  if (!title) throw new Error('Title is required.');

  let content: Record<string, unknown> | null = null;

  switch (type) {
    case 'text':
      content = { body: String(formData.get('body') ?? '') };
      break;
    case 'pdf':
    case 'download':
    case 'external_resource':
    case 'image':
      content = { url: String(formData.get('url') ?? '') };
      break;
    case 'code':
      content = { code: String(formData.get('code') ?? ''), language: String(formData.get('language') ?? '') };
      break;
    case 'video':
    case 'quiz':
    case 'assignment':
      content = null; // stored in a dedicated table below
      break;
  }

  await db.update(lessons).set({ title, type, isFreePreview, content }).where(eq(lessons.id, lessonId));

  if (type === 'video') {
    const provider = String(formData.get('provider') ?? 'other') as 'youtube_unlisted' | 'vimeo' | 'cloud_storage' | 'other';
    const providerReference = String(formData.get('providerReference') ?? '');
    const [existing] = await db.select({ id: lessonVideoSources.id }).from(lessonVideoSources).where(eq(lessonVideoSources.lessonId, lessonId));
    if (existing) {
      await db.update(lessonVideoSources).set({ provider, providerReference }).where(eq(lessonVideoSources.id, existing.id));
    } else {
      await db.insert(lessonVideoSources).values({ id: crypto.randomUUID(), lessonId, provider, providerReference });
    }
  }

  if (type === 'assignment') {
    const instructions = String(formData.get('instructions') ?? '');
    const submissionType = String(formData.get('submissionType') ?? 'text') as 'text' | 'file_upload' | 'external_link';
    const [existing] = await db.select({ id: assignments.id }).from(assignments).where(eq(assignments.lessonId, lessonId));
    if (existing) {
      await db.update(assignments).set({ instructions, submissionType }).where(eq(assignments.id, existing.id));
    } else {
      await db.insert(assignments).values({ id: crypto.randomUUID(), lessonId, instructions, submissionType });
    }
  }

  await logAudit({ actorUserId: admin.id, action: 'lesson.content_updated', targetType: 'lesson', targetId: lessonId });
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/admin/courses/${courseId}`);
}

// --- Quizzes -----------------------------------------------------------

export async function upsertQuiz(lessonId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const courseId = await getCourseIdForLesson(lessonId);
  if (!courseId) throw new Error('Lesson not found.');

  const passingPercentageRaw = Number(formData.get('passingPercentage'));
  const passingPercentage = Number.isFinite(passingPercentageRaw) ? passingPercentageRaw : 70;
  const maxAttemptsRaw = String(formData.get('maxAttempts') ?? '').trim();
  const maxAttemptsParsed = maxAttemptsRaw ? Number(maxAttemptsRaw) : null;
  const maxAttempts = maxAttemptsParsed !== null && Number.isFinite(maxAttemptsParsed) ? maxAttemptsParsed : null;

  const [existing] = await db.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.lessonId, lessonId));
  if (existing) {
    await db.update(quizzes).set({ passingPercentage, maxAttempts }).where(eq(quizzes.id, existing.id));
  } else {
    await db.insert(quizzes).values({ id: crypto.randomUUID(), lessonId, passingPercentage, maxAttempts });
  }

  await logAudit({ actorUserId: admin.id, action: 'quiz.upserted', targetType: 'lesson', targetId: lessonId });
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

export async function addQuizQuestion(quizId: string, lessonId: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');
  const courseId = await getCourseIdForLesson(lessonId);
  if (!courseId) throw new Error('Lesson not found.');

  const type = String(formData.get('type') ?? 'multiple_choice') as 'multiple_choice' | 'multiple_answer' | 'true_false' | 'short_answer';
  const prompt = String(formData.get('prompt') ?? '').trim();
  if (!prompt) throw new Error('Prompt is required.');

  let options: string[] | null = null;
  let correctAnswer: unknown = null;

  if (type === 'multiple_choice' || type === 'multiple_answer') {
    options = String(formData.get('options') ?? '')
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);
    const correctRaw = String(formData.get('correctAnswer') ?? '');
    correctAnswer = type === 'multiple_answer' ? correctRaw.split(',').map((s) => s.trim()).filter(Boolean) : correctRaw.trim();
  } else if (type === 'true_false') {
    correctAnswer = formData.get('correctAnswer') === 'true';
  } else {
    correctAnswer = String(formData.get('correctAnswer') ?? '').trim();
  }

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(quizQuestions).where(eq(quizQuestions.quizId, quizId));

  const id = crypto.randomUUID();
  await db.insert(quizQuestions).values({
    id,
    quizId,
    type,
    prompt,
    options,
    correctAnswer,
    explanation: String(formData.get('explanation') ?? '') || null,
    sortOrder: Number(count),
  });

  await logAudit({ actorUserId: admin.id, action: 'quiz_question.created', targetType: 'quiz_question', targetId: id });
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}

export async function deleteQuizQuestion(lessonId: string, questionId: string) {
  const admin = await requireAdminAction('courses.update');
  const courseId = await getCourseIdForLesson(lessonId);
  await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId));
  await logAudit({ actorUserId: admin.id, action: 'quiz_question.deleted', targetType: 'quiz_question', targetId: questionId });
  if (courseId) revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
}
