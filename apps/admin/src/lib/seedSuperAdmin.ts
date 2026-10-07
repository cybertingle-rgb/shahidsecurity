import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers, adminRoles, adminPermissions, adminRolePermissions, adminUserRoles } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';

/**
 * Creates the fixed role/permission catalog (Super Admin, Administrator,
 * Editor, SEO Manager, Finance, Support — per the brief's RBAC section)
 * and one Super Admin account, from real credentials the caller supplies
 * — never a hardcoded or generated-for-you password. Idempotent — safe
 * to call more than once; existing rows are left alone, only missing
 * ones are created. Shared by src/db/seed-super-admin.ts (the CLI
 * script, for a host with shell access) and
 * src/app/api/internal/seed-super-admin/route.ts (the secret-gated HTTP
 * equivalent, for a host without one — same reasoning as
 * /api/internal/migrate).
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  administrator: [
    'business.manage', 'services.manage', 'blog.manage', 'seo.manage', 'leads.manage',
    'payments.manage', 'testimonials.manage', 'media.manage', 'ai.manage', 'google.manage',
    'content.publish', 'seo.publish', 'deployment.rollback',
    // Prefixed with learn. — a distinct namespace from this app's own
    // keys above (e.g. payments.manage already means something else
    // here: this app's own invoices, not Learn's checkout/orders).
    // One broad key, same coarse-grained style as business.manage,
    // covering everything under /dashboard/learn — see
    // src/db/learnDb.ts for why this app can reach that data at all.
    'learn.manage',
  ],
  editor: ['blog.manage', 'services.manage', 'media.manage'],
  seo_manager: ['seo.manage', 'blog.manage'],
  finance: ['payments.manage', 'leads.view'],
  support: ['leads.manage', 'testimonials.manage'],
};

export async function seedSuperAdmin(email: string, password: string): Promise<{ created: boolean; email: string }> {
  const normalizedEmail = email.toLowerCase();
  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  const allPermissionKeys = new Set(Object.values(ROLE_PERMISSIONS).flat().filter((k) => k !== '*'));
  const permissionIdByKey = new Map<string, string>();
  for (const key of allPermissionKeys) {
    const existing = await db.select().from(adminPermissions).where(eq(adminPermissions.key, key)).limit(1);
    if (existing[0]) {
      permissionIdByKey.set(key, existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(adminPermissions).values({ id, key });
    permissionIdByKey.set(key, id);
  }

  const roleIdByName = new Map<string, string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const existing = await db.select().from(adminRoles).where(eq(adminRoles.name, roleName)).limit(1);
    if (existing[0]) {
      roleIdByName.set(roleName, existing[0].id);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(adminRoles).values({ id, name: roleName });
    roleIdByName.set(roleName, id);
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) continue;
    if (permissionKeys.includes('*')) continue;
    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;
      const existing = await db
        .select()
        .from(adminRolePermissions)
        .where(eq(adminRolePermissions.roleId, roleId))
        .then((rows) => rows.find((r) => r.permissionId === permissionId));
      if (!existing) {
        await db.insert(adminRolePermissions).values({ roleId, permissionId });
      }
    }
  }

  const existingUser = await db.select().from(adminUsers).where(eq(adminUsers.email, normalizedEmail)).limit(1);
  let userId = existingUser[0]?.id;
  let created = false;
  if (!userId) {
    userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(adminUsers).values({ id: userId, email: normalizedEmail, passwordHash, fullName: 'Super Admin', status: 'active' });
    created = true;
  }

  const superAdminRoleId = roleIdByName.get('super_admin');
  if (superAdminRoleId) {
    const existingAssignment = await db
      .select()
      .from(adminUserRoles)
      .where(eq(adminUserRoles.userId, userId))
      .then((rows) => rows.find((r) => r.roleId === superAdminRoleId));
    if (!existingAssignment) {
      await db.insert(adminUserRoles).values({ userId, roleId: superAdminRoleId });
    }
  }

  return { created, email: normalizedEmail };
}
