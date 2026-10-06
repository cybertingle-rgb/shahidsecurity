import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { consumePasswordResetToken } from '@/lib/auth/tokens';
import { destroyAllSessionsForUser } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(200),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input — password must be at least 12 characters.' }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, userId));

  // Resetting invalidates every existing session for that user — same
  // reasoning as apps/learn's identical route.
  await destroyAllSessionsForUser(userId);
  await logAudit({ actorUserId: userId, action: 'admin_user.password_reset_completed', targetType: 'admin_user', targetId: userId });

  return NextResponse.json({ message: 'Password has been reset. Please log in again.' }, { status: 200 });
}
