import { z } from 'zod';

// Fails fast with a clear error at startup instead of a confusing runtime
// crash later — same pattern as apps/learn/src/lib/env.ts. Every var here
// is documented in .env.example; nothing here has a value committed.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (a separate database from the LMS — see docs/DATABASE.md)'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  // Encrypts OAuth refresh/access tokens at rest in google_connections —
  // required before any Google integration can be connected, but not for
  // the rest of the app to function (see src/lib/crypto.ts).
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3200'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // apps/learn's own public URL — the unified /dashboard/learn section
  // still reads/writes that app's database directly, but any link a
  // *student* follows (an invite/activation email, a password-reset
  // link) must point at learn.shahidiqbal.com, where that account
  // actually logs in, never at this app's own domain.
  LEARN_APP_URL: z.string().url().default('http://localhost:3000'),

  // Google OAuth — optional. Unset disables every "Connect Google ___"
  // button (it renders disabled with a "not configured" note) rather than
  // breaking the rest of the app. See docs/GOOGLE_INTEGRATION_SETUP.md.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_ANALYTICS_PROPERTY_ID: z.string().optional(),

  // Outbound email (review requests, invoice emails) — optional, same
  // disables-the-feature-not-the-app pattern.
  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),

  // SMTP for password-reset emails (src/lib/email.ts) — same Hostinger
  // mailbox pattern as apps/learn. Optional: without these, a reset
  // request still works but the email is only logged to the server
  // console, never actually delivered — see docs/ADMIN_AUTH.md.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),

  // Payment provider abstraction — 'manual' (bank transfer, recorded by
  // hand) is always available with no credentials. A real provider only
  // activates once both of these are set to real values.
  PAYMENT_PROVIDER: z.enum(['manual', 'stripe']).default('manual'),
  PAYMENT_API_KEY: z.string().optional(),
  PAYMENT_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  LEARN_APP_URL: process.env.LEARN_APP_URL,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_ANALYTICS_PROPERTY_ID: process.env.GOOGLE_ANALYTICS_PROPERTY_ID,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
  PAYMENT_API_KEY: process.env.PAYMENT_API_KEY,
  PAYMENT_SECRET: process.env.PAYMENT_SECRET,
});

export const googleOAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
