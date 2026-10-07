import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, roles, permissions, rolePermissions, userRoles } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';

/**
 * Creates the fixed role/permission catalog (super_admin, admin,
 * instructor, student — same shape as src/db/seed.ts's dev-only fake
 * data seeder, but without any of the fake demo users/courses/products
 * it also creates) and one super_admin account, from real credentials
 * the caller supplies. Idempotent — safe to call more than once;
 * existing rows are left alone, only missing ones are created. The HTTP
 * equivalent of a CLI seed script, for a host with no shell access to
 * the deployed build — same reasoning as apps/admin's seedSuperAdmin.
 */
const PERMISSION_KEYS = [
  'users.manage',
  'roles.manage',
  'courses.create',
  'courses.update',
  'courses.delete',
  'courses.publish',
  'enrollments.manage',
  'products.manage',
  'prices.manage',
  'orders.manage',
  'payments.verify',
  'payments.refund',
  'communities.manage',
  'announcements.manage',
  'certificates.manage',
  'coupons.manage',
  'settings.manage',
  'audit_logs.view',
] as const;

const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  super_admin: PERMISSION_KEYS,
  admin: PERMISSION_KEYS.filter((k) => k !== 'roles.manage'),
  instructor: [],
  student: [],
};

export async function seedAdmin(email: string, password: string, fullName: string): Promise<{ created: boolean; email: string }> {
  const normalizedEmail = email.toLowerCase();
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  const permissionIdByKey = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const existing = await db.select().from(permissions).where(eq(permissions.key, key)).limit(1);
    if (existing[0]) {
      permissionIdByKey.set(key, existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(permissions).values({ id, key });
    permissionIdByKey.set(key, id);
  }

  const roleIdByName = new Map<string, string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const existing = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
    if (existing[0]) {
      roleIdByName.set(roleName, existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(roles).values({ id, name: roleName });
    roleIdByName.set(roleName, id);
  }

  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) continue;
    for (const key of keys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;
      const existing = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId))
        .then((rows) => rows.find((r) => r.permissionId === permissionId));
      if (!existing) {
        await db.insert(rolePermissions).values({ roleId, permissionId });
      }
    }
  }

  const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  let userId = existingUser[0]?.id;
  let created = false;
  if (!userId) {
    userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ id: userId, email: normalizedEmail, passwordHash, fullName, emailVerifiedAt: new Date(), status: 'active' });
    created = true;
  }

  const superAdminRoleId = roleIdByName.get('super_admin');
  if (superAdminRoleId) {
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId))
      .then((rows) => rows.find((r) => r.roleId === superAdminRoleId));
    if (!existingAssignment) {
      await db.insert(userRoles).values({ userId, roleId: superAdminRoleId });
    }
  }

  return { created, email: normalizedEmail };
}
