import { NextResponse } from 'next/server';
import { db } from '@/admin-core/db';
import { adminAuthEvents } from '@/admin-core/db/schema';
import { destroyCurrentSession, getSessionUser } from '@/admin-core/lib/auth/session';

export async function POST() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) {
    await db.insert(adminAuthEvents).values({ userId: user.id, eventType: 'logout' });
  }
  return NextResponse.json({ message: 'Logged out.' }, { status: 200 });
}
