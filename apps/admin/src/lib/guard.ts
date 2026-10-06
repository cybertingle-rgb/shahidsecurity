import { getSessionUser, type SessionAdminUser } from '@/lib/auth/session';
import { requirePermission, ForbiddenError } from '@/lib/rbac';

export class UnauthenticatedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Called as the first line of every admin Server Action — the dashboard
 * layout's "is a logged-in staff member" check keeps a signed-out
 * request from ever rendering these pages, but the action itself
 * re-checks the specific permission independently, so a permission
 * check is never the only thing standing between a request and a
 * privileged mutation. Same pattern as apps/learn/src/lib/admin/guard.ts.
 */
export async function requireAdminAction(permissionKey: string): Promise<SessionAdminUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  await requirePermission(user.id, permissionKey);
  return user;
}

export { ForbiddenError };
