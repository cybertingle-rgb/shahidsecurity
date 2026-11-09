import { redirect } from '@/admin-core/_compat/redirect';
import { getSessionUser } from '@/admin-core/lib/auth/session';

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? '/dashboard' : '/login');
}
