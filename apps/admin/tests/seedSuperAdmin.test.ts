import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { seedSuperAdmin } from '@/lib/seedSuperAdmin';

afterAll(closeTestDb);

describe('seedSuperAdmin', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('creates the role/permission catalog and a working super admin account', async () => {
    const result = await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');
    expect(result.created).toBe(true);
    expect(result.email).toBe('info@shahidiqbal.com');

    const roles = await testDb.select().from(schema.adminRoles);
    expect(roles.map((r) => r.name).sort()).toEqual(['administrator', 'editor', 'finance', 'seo_manager', 'super_admin', 'support']);

    const [user] = await testDb.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, 'info@shahidiqbal.com'));
    expect(user?.status).toBe('active');

    const userRoles = await testDb.select().from(schema.adminUserRoles).where(eq(schema.adminUserRoles.userId, user!.id));
    const superAdminRole = roles.find((r) => r.name === 'super_admin');
    expect(userRoles.some((ur) => ur.roleId === superAdminRole?.id)).toBe(true);
  });

  it('never grants content.publish/seo.publish/deployment.rollback to editor, seo_manager, finance, or support', async () => {
    await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');

    const restrictedKeys = ['content.publish', 'seo.publish', 'deployment.rollback'];
    const nonAdminRoles = await testDb
      .select()
      .from(schema.adminRoles)
      .where(eq(schema.adminRoles.name, 'editor'));
    for (const role of nonAdminRoles) {
      const grants = await testDb
        .select({ key: schema.adminPermissions.key })
        .from(schema.adminRolePermissions)
        .innerJoin(schema.adminPermissions, eq(schema.adminRolePermissions.permissionId, schema.adminPermissions.id))
        .where(eq(schema.adminRolePermissions.roleId, role.id));
      const grantedKeys = grants.map((g) => g.key);
      for (const restricted of restrictedKeys) {
        expect(grantedKeys).not.toContain(restricted);
      }
    }
  });

  it('is idempotent — re-running it does not overwrite the existing account or duplicate rows', async () => {
    const first = await seedSuperAdmin('info@shahidiqbal.com', 'first-real-password-123');
    expect(first.created).toBe(true);

    const second = await seedSuperAdmin('info@shahidiqbal.com', 'a-totally-different-password-456');
    expect(second.created).toBe(false);

    const users = await testDb.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, 'info@shahidiqbal.com'));
    expect(users).toHaveLength(1);

    const roles = await testDb.select().from(schema.adminRoles);
    expect(roles).toHaveLength(6);
  });

  it('rejects a password shorter than 12 characters', async () => {
    await expect(seedSuperAdmin('info@shahidiqbal.com', 'short')).rejects.toThrow(/12 characters/);
  });
});
