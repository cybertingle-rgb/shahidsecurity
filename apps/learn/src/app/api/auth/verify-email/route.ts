import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, authEvents } from '@/db/schema';
import { consumeEmailVerificationToken } from '@/lib/auth/tokens';

const schema = z.object({ token: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const userId = await consumeEmailVerificationToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ error: 'This verification link is invalid or has expired.' }, { status: 400 });
  }

  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await db.insert(authEvents).values({ userId, eventType: 'email_verified' });

  return NextResponse.json({ message: 'Email verified.' }, { status: 200 });
}
