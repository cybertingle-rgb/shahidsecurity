import { env } from '@/lib/env';

/**
 * Best-effort, non-blocking notification to apps/admin's AI knowledge-
 * review queue — see that app's src/app/api/public/ai-questions-intake/route.ts
 * and docs/AI_ASSISTANT_WORKFLOW.md. No-ops entirely unless both
 * ADMIN_AI_QUESTIONS_INTAKE_URL and _SECRET are set; every error is
 * caught and logged, never thrown — this must never affect Luna's own
 * response to the visitor who asked the question.
 */
export async function notifyAdminUnansweredQuestion(questionText: string): Promise<void> {
  if (!env.ADMIN_AI_QUESTIONS_INTAKE_URL || !env.ADMIN_AI_QUESTIONS_INTAKE_SECRET) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(env.ADMIN_AI_QUESTIONS_INTAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ai-questions-intake-secret': env.ADMIN_AI_QUESTIONS_INTAKE_SECRET },
      body: JSON.stringify({ questionText }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error('Luna: admin AI-questions intake notify failed (non-fatal)', err);
  }
}
