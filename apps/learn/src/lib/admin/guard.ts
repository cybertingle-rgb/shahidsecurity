import { getSessionUser, type SessionUser } from '@/lib/auth/session';
import { requirePermission, ForbiddenError } from '@/lib/rbac';

export class UnauthenticatedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Called as the first line of every admin Server Action, per
 * docs/lms-security.md's "requirePermission at the top of the handler"
 * pattern — the admin *layout*'s role check keeps a non-admin from ever
 * rendering these pages, but the action itself re-checks independently,
 * so a permission check is never the only thing standing between a
 * request and a privileged mutation.
 */
export async function requireAdminAction(permissionKey: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  await requirePermission(user.id, permissionKey);
  return user;
}

export { ForbiddenError };
