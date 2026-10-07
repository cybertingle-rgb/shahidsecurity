import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { destroyAllSessionsForUser } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit';

/**
 * Force-sets an EXISTING account's password over HTTP, for a host with
 * no shell access and where "Forgot password?" email delivery hasn't
 * been verified to actually work yet. Gated by the same SEED_SECRET as
 * /api/internal/seed-super-admin (same bootstrap category — a one-time
 * admin tool, not something to leave reachable indefinitely). Unlike
 * that route, this ALWAYS overwrites the password on a matching email;
 * it never creates a new account. Invalidates every existing session
 * for that account, same as the token-based reset-password route.
 */
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  const provided = request.headers.get('x-seed-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid input — password must be at least 12 characters.' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ success: false, error: 'No account with that email.' }, { status: 404 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, user.id));
  await destroyAllSessionsForUser(user.id);
  await logAudit({ actorUserId: user.id, action: 'admin_user.password_force_set', targetType: 'admin_user', targetId: user.id });

  return NextResponse.json({ success: true, message: `Password set for ${email}. All existing sessions for this account were signed out.` });
}
