import { NextResponse } from 'next/server';
import { db } from '@/db';
import { adminAuthEvents } from '@/db/schema';
import { destroyCurrentSession, getSessionUser } from '@/lib/auth/session';

export async function POST() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) {
    await db.insert(adminAuthEvents).values({ userId: user.id, eventType: 'logout' });
  }
  return NextResponse.json({ message: 'Logged out.' }, { status: 200 });
}
