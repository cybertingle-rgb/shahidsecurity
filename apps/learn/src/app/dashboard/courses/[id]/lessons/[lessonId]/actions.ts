'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth/session';
import { markLessonComplete, submitQuizAttempt } from '@/lib/student/data';

export async function markComplete(courseId: string, lessonId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error('Not signed in.');

  const result = await markLessonComplete(session.id, lessonId);
  if (!result.ok) throw new Error('Could not mark this lesson complete.');

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
}

export async function submitQuiz(
  courseId: string,
  lessonId: string,
  quizId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; scorePercentage?: number; passed?: boolean; showAnswers?: boolean }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, error: 'Not signed in.' };

  const result = await submitQuizAttempt(session.id, quizId, answers);
  if (result.ok) {
    revalidatePath(`/dashboard/courses/${courseId}`);
    revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  }
  return result;
}
