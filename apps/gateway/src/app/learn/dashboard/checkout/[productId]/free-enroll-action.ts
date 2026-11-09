'use server';

import { redirect } from '@/learn-core/_compat/redirect';
import { getSessionUser } from '@/learn-core/lib/auth/session';
import { enrollInFreeCourse } from '@/learn-core/lib/checkout';

export async function enrollFree(productId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error('Not signed in.');

  const result = await enrollInFreeCourse(session.id, productId);
  if (!result.ok) throw new Error(result.error);

  redirect('/dashboard/courses?enrolled=1');
}
