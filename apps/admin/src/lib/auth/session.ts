import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db';
import { adminSessions, adminUsers } from '@/db/schema';

export const SESSION_COOKIE_NAME = 'ssa_session';
// Every user of this app is a staff admin, so the shorter admin session
// lifetime apps/learn applies only to its admin area applies here to
// every session, not just a subset.
const SESSION_HOURS = 12;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  opts: { ipAddress?: string | null; userAgent?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

  await db.insert(adminSessions).values({
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

export type SessionAdminUser = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended';
};

/**
 * Validates the session cookie against the database on every call —
 * never trusts a client-readable claim. Returns null for missing,
 * expired, revoked, or suspended-account sessions.
 */
export async function getSessionUser(): Promise<SessionAdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      expiresAt: adminSessions.expiresAt,
      userId: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      status: adminUsers.status,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.sessionTokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || row.status !== 'active') return null;

  return { id: row.userId, email: row.email, fullName: row.fullName, status: row.status };
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(adminSessions).where(eq(adminSessions.sessionTokenHash, hashToken(token)));
  }
  await clearSessionCookie();
}

export async function destroyAllSessionsForUser(userId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}
