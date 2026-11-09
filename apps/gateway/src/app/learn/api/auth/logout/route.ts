import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/learn-core/lib/auth/session';

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ message: 'Logged out.' }, { status: 200 });
}
