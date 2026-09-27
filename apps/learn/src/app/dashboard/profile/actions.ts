'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSessionUser } from '@/lib/auth/session';

/**
 * The user id acted on always comes from the session, never from the
 * form or any client-supplied value — there is no parameter here a
 * request could override to edit someone else's profile.
 */
export async function updateMyProfile(formData: FormData) {
  const session = await getSessionUser();
  if (!session) throw new Error('Not signed in.');

  const fullName = String(formData.get('fullName') ?? '').trim();
  if (!fullName) throw new Error('Full name is required.');

  await db
    .update(users)
    .set({
      fullName,
      phone: String(formData.get('phone') ?? '').trim() || null,
      countryCode: (String(formData.get('countryCode') ?? '').trim().toUpperCase() || null) as string | null,
      username: String(formData.get('username') ?? '').trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.id));

  revalidatePath('/dashboard/profile');
}
