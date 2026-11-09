'use server';

import { redirect } from '@/learn-core/_compat/redirect';
import { destroyCurrentSession } from '@/learn-core/lib/auth/session';

export async function logoutAction() {
  await destroyCurrentSession();
  redirect('/login');
}
