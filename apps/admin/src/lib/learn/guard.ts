import { getSessionUser, type SessionAdminUser } from '@/lib/auth/session';
import { requirePermission, ForbiddenError } from '@/lib/rbac';

export class UnauthenticatedError extends Error {
  constructor() {
    super('Not signed in');
    this.name = 'UnauthenticatedError';
  }
}

/**
 * Called as the first line of every ported Learn admin Server Action.
 * Learn's own modules each checked a specific Learn-scoped permission key
 * (e.g. 'students.manage') against Learn's own RBAC tables; here there is
 * a single coarse 'learn.manage' key on this app's own RBAC instead (see
 * src/lib/seedSuperAdmin.ts), so the specific key argument is accepted
 * for call-site compatibility but ignored.
 */
export async function requireAdminAction(_permissionKey?: string): Promise<SessionAdminUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthenticatedError();
  await requirePermission(user.id, 'learn.manage');
  return user;
}

export { ForbiddenError };
