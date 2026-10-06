import { z } from 'zod';

// Fails fast with a clear error at startup instead of a confusing runtime
// crash later — see docs/LMS_PRE_PHASE_2_REVIEW.md §11 for what each of
// these is for and where it's expected to live (secret store vs. plain
// config).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (external managed Postgres — see docs/LMS_PRE_PHASE_2_REVIEW.md §11)'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // "Continue with Google" — both unset simply disables the feature (the
  // button hides itself and the routes 500 defensively) rather than
  // breaking every other unrelated env var check, since not every
  // environment (local dev, test) needs it configured.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Luna (the AI assistant widget on both shahidiqbal.com and
  // learn.shahidiqbal.com) — unset simply disables the chat endpoint
  // (it responds with a clear "not configured" error) rather than
  // breaking every other unrelated env var check.
  ANTHROPIC_API_KEY: z.string().optional(),
  // Best-effort logging of questions Luna's curated FAQ fast-path
  // didn't cover, to apps/admin's AI knowledge-review queue — both unset
  // simply disables the call (see src/app/api/luna/chat/route.ts) rather
  // than affecting Luna's own responses. See docs/AI_ASSISTANT_WORKFLOW.md.
  ADMIN_AI_QUESTIONS_INTAKE_URL: z.string().optional(),
  ADMIN_AI_QUESTIONS_INTAKE_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ADMIN_AI_QUESTIONS_INTAKE_URL: process.env.ADMIN_AI_QUESTIONS_INTAKE_URL,
  ADMIN_AI_QUESTIONS_INTAKE_SECRET: process.env.ADMIN_AI_QUESTIONS_INTAKE_SECRET,
});
