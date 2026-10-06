import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { aiQuestions } from '@/db/schema';
import { checkRateLimit } from '@/lib/auth/rateLimit';

/**
 * Secret-gated intake for questions Luna (apps/learn's chatbot) fell
 * through to the Claude API for — i.e. ones its curated local FAQ
 * fast-path (matchLunaFaq) didn't cover — so an admin can review the
 * real gaps and decide whether to add a curated answer. Called
 * best-effort, after Luna has already answered the visitor; must never
 * affect or delay that response (see apps/learn/src/app/api/luna/chat/route.ts).
 * This never logs anything beyond the question text the visitor
 * actually typed — no identifying info is collected here.
 */
const bodySchema = z.object({
  questionText: z.string().min(1).max(4000),
});

export async function POST(request: NextRequest) {
  const secret = process.env.AI_QUESTIONS_INTAKE_SECRET;
  const provided = request.headers.get('x-ai-questions-intake-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`ai-questions-intake:ip:${ip}`, { maxAttempts: 60, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(aiQuestions).values({ id, questionText: parsed.data.questionText });
  return NextResponse.json({ success: true, id });
}
