import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers, adminAuthEvents } from '@/db/schema';
import { verifyPassword } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createSession, setSessionCookie } from '@/lib/auth/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * No public registration route exists in this app — every admin_users
 * row is created by an existing Super Admin (Phase 1 user management UI)
 * or by the one-time seed-super-admin script, never by self-signup.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const userAgent = request.headers.get('user-agent');

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const ipAllowed = await checkRateLimit(`login:ip:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  const accountAllowed = await checkRateLimit(`login:email:${email}`, { maxAttempts: 8, windowMs: 15 * 60 * 1000 });
  if (!ipAllowed || !accountAllowed) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
  }

  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const user = rows[0];

  // Constant-shape response whether or not the account exists, same
  // anti-enumeration reasoning as apps/learn's login route.
  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, 'scrypt$32768$8$1$00$00');

  if (!user || !passwordOk) {
    await db.insert(adminAuthEvents).values({ userId: user?.id, eventType: 'login_failed', ipAddress: ip, userAgent });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  if (user.status !== 'active') {
    return NextResponse.json({ error: 'This account is suspended.' }, { status: 403 });
  }

  const { token, expiresAt } = await createSession(user.id, { ipAddress: ip, userAgent });
  await setSessionCookie(token, expiresAt);

  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.insert(adminAuthEvents).values({ userId: user.id, eventType: 'login_success', ipAddress: ip, userAgent });

  return NextResponse.json({ message: 'Logged in.' }, { status: 200 });
}
