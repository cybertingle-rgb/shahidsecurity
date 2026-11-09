import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/admin-core/db';
import { adminUsers, adminAuthEvents } from '@/admin-core/db/schema';
import { verifyPassword } from '@/admin-core/lib/auth/password';
import { checkRateLimit } from '@/admin-core/lib/auth/rateLimit';
import { createSession, setSessionCookie } from '@/admin-core/lib/auth/session';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * No public registration route exists in this app — every admin_users
 * row is created by an existing Super Admin (Phase 1 user management UI)
 * or by the one-time seed-super-admin script, never by self-signup.
 */
// TEMPORARY diagnostic logging (docs/consolidation/MIGRATION_VALIDATION_REPORT.md
// §1.5) — pinpointing a reported production login hang that server-side
// request logs can't otherwise show (the standalone server logs nothing
// per-request by default). Remove once the hang is root-caused and fixed.
export async function POST(request: NextRequest) {
  const reqId = Math.random().toString(36).slice(2, 8);
  console.log(`[login:${reqId}] start`);
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const userAgent = request.headers.get('user-agent');

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    console.log(`[login:${reqId}] invalid input`);
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  console.log(`[login:${reqId}] parsed body ok`);

  const email = parsed.data.email.toLowerCase();

  console.log(`[login:${reqId}] checking rate limit...`);
  const ipAllowed = await checkRateLimit(`login:ip:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  const accountAllowed = await checkRateLimit(`login:email:${email}`, { maxAttempts: 8, windowMs: 15 * 60 * 1000 });
  console.log(`[login:${reqId}] rate limit checked: ipAllowed=${ipAllowed} accountAllowed=${accountAllowed}`);
  if (!ipAllowed || !accountAllowed) {
    return NextResponse.json({ error: 'Too many login attempts. Try again later.' }, { status: 429 });
  }

  console.log(`[login:${reqId}] looking up user...`);
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const user = rows[0];
  console.log(`[login:${reqId}] user lookup done: found=${Boolean(user)}`);

  // Constant-shape response whether or not the account exists, same
  // anti-enumeration reasoning as apps/learn's login route.
  console.log(`[login:${reqId}] verifying password...`);
  const passwordOk = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, 'scrypt$32768$8$1$00$00');
  console.log(`[login:${reqId}] password verified: ok=${passwordOk}`);

  if (!user || !passwordOk) {
    await db.insert(adminAuthEvents).values({ userId: user?.id, eventType: 'login_failed', ipAddress: ip, userAgent });
    console.log(`[login:${reqId}] rejected: invalid credentials`);
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  if (user.status !== 'active') {
    console.log(`[login:${reqId}] rejected: account suspended`);
    return NextResponse.json({ error: 'This account is suspended.' }, { status: 403 });
  }

  console.log(`[login:${reqId}] creating session...`);
  const { token, expiresAt } = await createSession(user.id, { ipAddress: ip, userAgent });
  await setSessionCookie(token, expiresAt);
  console.log(`[login:${reqId}] session created + cookie set`);

  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  await db.insert(adminAuthEvents).values({ userId: user.id, eventType: 'login_success', ipAddress: ip, userAgent });
  console.log(`[login:${reqId}] done, responding 200`);

  return NextResponse.json({ message: 'Logged in.' }, { status: 200 });
}
