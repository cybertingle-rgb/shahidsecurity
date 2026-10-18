'use server';

import { redirect } from 'next/navigation';
import { db } from '@/db';
import { adminAuthEvents } from '@/db/schema';
import { destroyCurrentSession, getSessionUser } from '@/lib/auth/session';

// Same effect as POST /api/auth/logout, as a server action so
// PortalSidebar's logout button (a <form action={...}>, matching
// apps/learn's dashboard) can call it directly without a client-side fetch.
export async function logoutAction() {
  const user = await getSessionUser();
  await destroyCurrentSession();
  if (user) {
    await db.insert(adminAuthEvents).values({ userId: user.id, eventType: 'logout' });
  }
  redirect('/login');
}
