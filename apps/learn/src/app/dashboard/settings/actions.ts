'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, authEvents } from '@/db/schema';
import { getSessionUser, destroyAllSessionsForUser } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export async function changePassword(formData: FormData) {
  const session = await getSessionUser();
  if (!session) throw new Error('Not signed in.');

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  if (newPassword.length < 10) throw new Error('New password must be at least 10 characters.');

  const [user] = await db.select().from(users).where(eq(users.id, session.id));
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error('Current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, session.id));

  // Same rule as the forgot-password flow: changing a password invalidates
  // every existing session, including this one — docs/lms-security.md.
  await destroyAllSessionsForUser(session.id);
  await db.insert(authEvents).values({ userId: session.id, eventType: 'password_reset_completed' });

  redirect('/login');
}
