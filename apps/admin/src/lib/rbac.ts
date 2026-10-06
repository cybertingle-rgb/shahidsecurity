import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { adminUserRoles, adminRoles, adminRolePermissions, adminPermissions } from '@/db/schema';

/**
 * Permissions are granular and stored in the database, not hardcoded
 * `if (role === 'admin')` checks — same reasoning as
 * apps/learn/src/lib/rbac.ts. Always re-reads from the database; never
 * trusts a role/permission claim embedded in a cookie or client state.
 */
export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const userRoleRows = await db.select({ roleId: adminUserRoles.roleId }).from(adminUserRoles).where(eq(adminUserRoles.userId, userId));
  const roleIds = userRoleRows.map((r) => r.roleId);
  if (roleIds.length === 0) return new Set();

  const rows = await db
    .select({ key: adminPermissions.key })
    .from(adminRolePermissions)
    .innerJoin(adminPermissions, eq(adminRolePermissions.permissionId, adminPermissions.id))
    .where(inArray(adminRolePermissions.roleId, roleIds));

  return new Set(rows.map((r) => r.key));
}

export async function getUserRoleNames(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ name: adminRoles.name })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
    .where(eq(adminUserRoles.userId, userId));
  return new Set(rows.map((r) => r.name));
}

export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const roleNames = await getUserRoleNames(userId);
  // super_admin is granted every permission implicitly, rather than via
  // rows in admin_role_permissions — see docs/ADMIN_ARCHITECTURE.md.
  if (roleNames.has(SUPER_ADMIN_ROLE)) return true;

  const keys = await getUserPermissionKeys(userId);
  return keys.has(permissionKey);
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Call as the *first* thing in any server action/route handler that
 * touches privileged data. Throws rather than returning a boolean so a
 * forgotten check fails loudly instead of silently continuing — same
 * pattern as apps/learn/src/lib/rbac.ts.
 */
export async function requirePermission(userId: string, permissionKey: string): Promise<void> {
  const allowed = await userHasPermission(userId, permissionKey);
  if (!allowed) {
    throw new ForbiddenError(`Missing permission: ${permissionKey}`);
  }
}

export async function requireAnyRole(userId: string, roleNames: string[]): Promise<void> {
  const userRoleSet = await getUserRoleNames(userId);
  const hasRole = roleNames.some((name) => userRoleSet.has(name));
  if (!hasRole) {
    throw new ForbiddenError(`Requires one of roles: ${roleNames.join(', ')}`);
  }
}

/** The one role every permission check in this app implicitly trusts completely. */
export const SUPER_ADMIN_ROLE = 'super_admin';
