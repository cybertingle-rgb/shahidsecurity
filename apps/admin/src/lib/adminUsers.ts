import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers, adminRoles, adminUserRoles } from '@/db/schema';
import { SUPER_ADMIN_ROLE } from '@/lib/rbac';

export type AdminUserWithRoles = {
  id: string;
  email: string;
  fullName: string;
  status: 'active' | 'suspended';
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: string[];
};

async function rolesByUserId(): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ userId: adminUserRoles.userId, roleName: adminRoles.name })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id));

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.userId) ?? [];
    list.push(row.roleName);
    map.set(row.userId, list);
  }
  return map;
}

export async function listAdminUsers(): Promise<AdminUserWithRoles[]> {
  const users = await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  const roleMap = await rolesByUserId();
  return users.map((u) => ({ ...u, roles: roleMap.get(u.id) ?? [] }));
}

export async function getAdminUserById(id: string): Promise<AdminUserWithRoles | null> {
  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!user) return null;
  const roleRows = await db
    .select({ roleName: adminRoles.name })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
    .where(eq(adminUserRoles.userId, id));
  return { ...user, roles: roleRows.map((r) => r.roleName) };
}

export async function listRoles(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: adminRoles.id, name: adminRoles.name }).from(adminRoles).orderBy(adminRoles.name);
}

/**
 * Guards against ever reaching zero active Super Admins, which would
 * permanently lock every user out of the account-management area
 * itself (nobody left with `users.manage` to fix it). Counts active,
 * non-suspended Super Admins other than `excludeUserId`.
 */
export async function countOtherActiveSuperAdmins(excludeUserId: string): Promise<number> {
  const rows = await db
    .select({ userId: adminUserRoles.userId, status: adminUsers.status })
    .from(adminUserRoles)
    .innerJoin(adminRoles, eq(adminUserRoles.roleId, adminRoles.id))
    .innerJoin(adminUsers, eq(adminUserRoles.userId, adminUsers.id))
    .where(eq(adminRoles.name, SUPER_ADMIN_ROLE));

  return rows.filter((r) => r.userId !== excludeUserId && r.status === 'active').length;
}

export async function emailInUseByOtherUser(email: string, excludeUserId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  return Boolean(existing && existing.id !== excludeUserId);
}
