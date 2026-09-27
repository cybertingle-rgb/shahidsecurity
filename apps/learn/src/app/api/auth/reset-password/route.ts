import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, authEvents } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { consumePasswordResetToken } from '@/lib/auth/tokens';
import { destroyAllSessionsForUser } from '@/lib/auth/session';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(10).max(200),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  // "Resetting invalidates all existing sessions for that user" — docs/lms-security.md.
  await destroyAllSessionsForUser(userId);
  await db.insert(authEvents).values({ userId, eventType: 'password_reset_completed' });

  return NextResponse.json({ message: 'Password has been reset. Please log in again.' }, { status: 200 });
}
