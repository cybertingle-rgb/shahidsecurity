import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, roles, userRoles, authEvents } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createEmailVerificationToken } from '@/lib/auth/tokens';
import { sendEmail, authEmailHtml } from '@/lib/email';
import { env } from '@/lib/env';

// "Nothing more than that" — docs/lms-student-guide.md's data-minimization
// rule. Country is asked at registration because it's the day-one input
// to the country/currency price-resolution logic (docs/lms-business-model.md).
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10).max(200),
  fullName: z.string().min(1).max(200),
  countryCode: z.string().length(2).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  const allowed = await checkRateLimit(`register:ip:${ip}`, { maxAttempts: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    // Same generic response as a fresh registration would eventually reach
    // (i.e. "check your email") — never confirms account existence to an
    // unauthenticated caller, which would otherwise leak which emails are
    // registered.
    return NextResponse.json({ message: 'If that email can be registered, a verification email has been sent.' }, { status: 200 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // MySQL has no RETURNING clause, so the id is generated here and used
  // directly rather than read back after the insert.
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    fullName: parsed.data.fullName,
    countryCode: parsed.data.countryCode ?? null,
  });

  const [studentRole] = await db.select().from(roles).where(eq(roles.name, 'student')).limit(1);
  if (studentRole) {
    await db.insert(userRoles).values({ userId, roleId: studentRole.id });
  }

  await db.insert(authEvents).values({ userId, eventType: 'register', ipAddress: ip });

  const token = await createEmailVerificationToken(userId);
  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail(
    email,
    'Verify your Learn with Shahid account',
    `Verify your email: ${verifyUrl}`,
    authEmailHtml({
      heading: 'Verify your email',
      intro: "You're almost set — confirm your email address to activate your Learn with Shahid account.",
      buttonLabel: 'Verify email',
      buttonUrl: verifyUrl,
    }),
  );

  return NextResponse.json({ message: 'If that email can be registered, a verification email has been sent.' }, { status: 201 });
}
