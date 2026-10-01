import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { env } from '@/lib/env';
import { LUNA_SYSTEM_PROMPT, matchLunaFaq } from '@/lib/luna';

// Public, unauthenticated, cross-origin by design — this is the one real
// server in the project (the Astro marketing site is static, with no
// backend of its own), so its widget calls this endpoint directly from
// shahidiqbal.com. No cookies/credentials are involved, so an open CORS
// policy (matching /api/public/pricing's convention) is the right call,
// not a security gap.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

// Capped history length and per-message length bound both the Claude
// API cost of a single request and the blast radius of someone scripting
// abuse against this public endpoint — on top of the per-IP rate limit
// below.
const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`luna:chat:ip:${ip}`, { maxAttempts: 30, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many messages. Please try again in a few minutes.' }, { status: 429, headers: CORS_HEADERS });
  }

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: CORS_HEADERS });
  }

  // The local FAQ fast path runs before the API key check, deliberately —
  // it needs no key and costs nothing, so the common questions (starting
  // with the widget's own suggested ones) work even before Anthropic
  // billing is set up, and stay instant/free afterward too.
  const lastUserMessage = [...parsed.data.messages].reverse().find((m) => m.role === 'user');
  const faqAnswer = lastUserMessage ? matchLunaFaq(lastUserMessage.content) : null;
  if (faqAnswer) {
    return NextResponse.json({ reply: faqAnswer }, { headers: CORS_HEADERS });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Luna is not available right now.' }, { status: 503, headers: CORS_HEADERS });
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 1024,
      // A support-chat Q&A doesn't need deep multi-step reasoning —
      // low effort keeps latency and cost down for what's usually a
      // short factual answer or a redirect to the right page.
      output_config: { effort: 'low' },
      system: LUNA_SYSTEM_PROMPT,
      messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content.find((block) => block.type === 'text')?.text ?? "Sorry, I couldn't put together an answer for that — try rephrasing, or reach out at info@shahidiqbal.com.";

    return NextResponse.json({ reply: text }, { headers: CORS_HEADERS });
  } catch (err) {
    // Distinguishing these cases in the response itself (not just the
    // server log) matters here specifically because this session has no
    // access to production logs — the single most common first-setup
    // failure is a brand-new API key with no credit loaded yet, which
    // Anthropic reports as a 400 "credit balance too low", easy to
    // mistake for a code bug without this.
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('Luna: invalid Anthropic API key', err);
      return NextResponse.json({ error: 'Luna is misconfigured (invalid API key).' }, { status: 502, headers: CORS_HEADERS });
    }
    // Anthropic reports "credit balance too low" (the most common
    // first-setup failure — a brand-new key with no credit loaded) as a
    // 400, not a 403, so it surfaces as BadRequestError here.
    if (err instanceof Anthropic.BadRequestError) {
      console.error('Luna: Anthropic API rejected the request (often: no credit on the account)', err);
      return NextResponse.json(
        { error: "Luna's account needs billing set up (add credit at console.anthropic.com)." },
        { status: 502, headers: CORS_HEADERS },
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      console.error('Luna: Anthropic rate limit hit', err);
      return NextResponse.json({ error: 'Luna is busy right now. Please try again in a moment.' }, { status: 502, headers: CORS_HEADERS });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`Luna: Anthropic API error ${err.status}`, err);
      return NextResponse.json({ error: `Luna had trouble answering that (API error ${err.status}).` }, { status: 502, headers: CORS_HEADERS });
    }
    console.error('Luna chat request failed', err);
    return NextResponse.json({ error: 'Luna had trouble answering that. Please try again shortly.' }, { status: 502, headers: CORS_HEADERS });
  }
}
