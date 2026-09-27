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
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});
