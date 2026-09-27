import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { userRoles, roles, rolePermissions, permissions } from '@/db/schema';

/**
 * Permissions are granular and stored in the database, not hardcoded
 * `if (role === 'admin')` checks — see docs/lms-database.md. Always
 * re-reads from the database; never trusts a role/permission claim
 * embedded in a cookie or client state (docs/lms-security.md).
 */
export async function getUserPermissionKeys(userId: string): Promise<Set<string>> {
  const userRoleRows = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId));
  const roleIds = userRoleRows.map((r) => r.roleId);
  if (roleIds.length === 0) return new Set();

  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));

  return new Set(rows.map((r) => r.key));
}

export async function getUserRoleNames(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return new Set(rows.map((r) => r.name));
}

export async function userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
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
 * Call as the *first* thing in any route/handler that touches
 * privileged data, per docs/lms-security.md's
 * "requirePermission(session, 'courses.update') at the top of the
 * handler" pattern. Throws rather than returning a boolean so a
 * forgotten check fails loudly instead of silently continuing.
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
