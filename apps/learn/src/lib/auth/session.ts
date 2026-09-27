import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';

export const SESSION_COOKIE_NAME = 'lws_session';
const STUDENT_SESSION_DAYS = 30;
// Shorter admin session lifetime, per docs/lms-security.md's admin
// hardening section. Which duration applies is decided by the caller
// (the login route checks the user's roles), not by this module.
const ADMIN_SESSION_HOURS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionDurationMs(isAdmin: boolean): number {
  return isAdmin ? ADMIN_SESSION_HOURS * 60 * 60 * 1000 : STUDENT_SESSION_DAYS * 24 * 60 * 60 * 1000;
}

export async function createSession(
  userId: string,
  opts: { isAdmin: boolean; ipAddress?: string | null; userAgent?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDurationMs(opts.isAdmin));

  await db.insert(sessions).values({
    userId,
    sessionTokenHash: hashToken(token),
    ipAddress: opts.ipAddress ?? null,
    userAgent: opts.userAgent ?? null,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended';
};

/**
 * Validates the session cookie against the database on every call — never
 * trusts a client-readable claim. Returns null for missing, expired, or
 * revoked sessions, and for a suspended account, per docs/lms-security.md.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.sessionTokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== 'active') return null;

  return { id: row.userId, email: row.email, fullName: row.fullName, status: row.status };
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionTokenHash, hashToken(token)));
  }
  await clearSessionCookie();
}

/** Used by password reset: "resetting invalidates all existing sessions for that user" (docs/lms-security.md). */
export async function destroyAllSessionsForUser(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
