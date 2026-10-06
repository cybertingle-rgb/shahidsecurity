import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { adminUsers, adminRoles, adminPermissions, adminRolePermissions, adminUserRoles } from './schema';
import { hashPassword } from '../lib/auth/password';

/**
 * One-time setup: creates the fixed role/permission catalog (Super
 * Admin, Administrator, Editor, SEO Manager, Finance, Support — per the
 * brief's RBAC section) and the first Super Admin account, from real
 * credentials supplied via environment variables, never a hardcoded or
 * generated-for-you password. Idempotent — safe to re-run; existing
 * rows are left alone, only missing ones are created.
 *
 * Run as:
 *   ADMIN_SEED_EMAIL=you@example.com ADMIN_SEED_PASSWORD='a real strong password' pnpm db:seed-super-admin
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  administrator: [
    'business.manage', 'services.manage', 'blog.manage', 'seo.manage', 'leads.manage',
    'payments.manage', 'testimonials.manage', 'media.manage', 'ai.manage',
  ],
  editor: ['blog.manage', 'services.manage', 'media.manage'],
  seo_manager: ['seo.manage', 'blog.manage'],
  finance: ['payments.manage', 'leads.view'],
  support: ['leads.manage', 'testimonials.manage'],
};

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required — set them to real credentials you choose, not a placeholder.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters.');
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
    // super_admin's '*' isn't stored as a row — requirePermission treats
    // the super_admin role as implicitly satisfying every check (see
    // src/lib/rbac.ts), so there's nothing to grant here for it.
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

  const existingUser = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  let userId = existingUser[0]?.id;
  if (!userId) {
    userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(adminUsers).values({ id: userId, email, passwordHash, fullName: 'Super Admin', status: 'active' });
    console.log(`Created admin user ${email}.`);
  } else {
    console.log(`Admin user ${email} already exists — leaving it as is.`);
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

  console.log('Done. Roles, permissions, and the super admin account are ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
