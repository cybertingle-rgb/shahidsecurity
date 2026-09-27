import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { requirePermission, ForbiddenError } from '@/lib/rbac';

/**
 * Every Phase 3 admin Server Action (src/app/admin/<resource>/actions.ts) starts
 * with requireAdminAction(<key>), which is requirePermission() under the
 * hood — already proven generically in rbac.test.ts. This file checks the
 * *specific* keys those new actions actually use, seeded by
 * src/db/seed.ts, so a typo in either the seed list or an action's
 * permission string would fail a real test instead of silently no-op'ing.
 */

const NEW_ADMIN_PERMISSION_KEYS = [
  'courses.create',
  'courses.update',
  'courses.publish',
  'products.manage',
  'prices.manage',
  'enrollments.manage',
  'payments.verify',
  'communities.manage',
  'announcements.manage',
  'users.manage',
] as const;

afterAll(closeTestDb);

describe('Phase 3 admin action permission keys', () => {
  beforeEach(truncateAll);

  it('every permission key a Phase 3 admin action checks actually exists and can be granted', async () => {
    const roleId = crypto.randomUUID();
    await testDb.insert(schema.roles).values({ id: roleId, name: 'test_admin' });

    const userId = crypto.randomUUID();
    await testDb.insert(schema.users).values({ id: userId, email: 'admin-perm-test@rbac.test', passwordHash: 'x', fullName: 'Admin Perm Test' });
    await testDb.insert(schema.userRoles).values({ userId, roleId });

    for (const key of NEW_ADMIN_PERMISSION_KEYS) {
      const permissionId = crypto.randomUUID();
      await testDb.insert(schema.permissions).values({ id: permissionId, key });
      await testDb.insert(schema.rolePermissions).values({ roleId, permissionId });
    }

    for (const key of NEW_ADMIN_PERMISSION_KEYS) {
      await expect(requirePermission(userId, key)).resolves.toBeUndefined();
    }
  });

  it('a user granted only one of these keys is denied every other one — no cross-grant leakage', async () => {
    const roleId = crypto.randomUUID();
    await testDb.insert(schema.roles).values({ id: roleId, name: 'payments_only' });
    const permissionId = crypto.randomUUID();
    await testDb.insert(schema.permissions).values({ id: permissionId, key: 'payments.verify' });
    await testDb.insert(schema.rolePermissions).values({ roleId, permissionId });

    const userId = crypto.randomUUID();
    await testDb.insert(schema.users).values({ id: userId, email: 'payments-only@rbac.test', passwordHash: 'x', fullName: 'Payments Only' });
    await testDb.insert(schema.userRoles).values({ userId, roleId });

    await expect(requirePermission(userId, 'payments.verify')).resolves.toBeUndefined();
    await expect(requirePermission(userId, 'courses.publish')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requirePermission(userId, 'enrollments.manage')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requirePermission(userId, 'users.manage')).rejects.toBeInstanceOf(ForbiddenError);
  });
});
