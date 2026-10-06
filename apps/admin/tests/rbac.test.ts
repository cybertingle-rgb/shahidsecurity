import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { requirePermission, requireAnyRole, userHasPermission, ForbiddenError, SUPER_ADMIN_ROLE } from '@/lib/rbac';

async function makeRole(name: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.adminRoles).values({ id, name });
  return { id, name };
}

async function makeRoleWithPermission(roleName: string, permissionKey: string) {
  const role = await makeRole(roleName);
  const permissionId = crypto.randomUUID();
  await testDb.insert(schema.adminPermissions).values({ id: permissionId, key: permissionKey });
  await testDb.insert(schema.adminRolePermissions).values({ roleId: role.id, permissionId });
  return role;
}

async function makeUser(email: string, roleId?: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.adminUsers).values({ id, email, passwordHash: 'x', fullName: email });
  if (roleId) {
    await testDb.insert(schema.adminUserRoles).values({ userId: id, roleId });
  }
  return { id, email };
}

afterAll(closeTestDb);

describe('RBAC — permissions are re-read from the database, not trusted from a claim', () => {
  beforeEach(truncateAll);

  it('grants access to a user whose role has the permission', async () => {
    const editorRole = await makeRoleWithPermission('editor', 'blog.manage');
    const editor = await makeUser('editor@rbac.test', editorRole.id);

    expect(await userHasPermission(editor.id, 'blog.manage')).toBe(true);
    await expect(requirePermission(editor.id, 'blog.manage')).resolves.toBeUndefined();
  });

  it('denies access to a user without the permission', async () => {
    await makeRoleWithPermission('editor', 'blog.manage');
    const supportRole = await makeRole('support');
    const support = await makeUser('support@rbac.test', supportRole.id);

    expect(await userHasPermission(support.id, 'blog.manage')).toBe(false);
    await expect(requirePermission(support.id, 'blog.manage')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('denies access to a user with no role at all', async () => {
    const user = await makeUser('noroles@rbac.test');
    await expect(requirePermission(user.id, 'blog.manage')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireAnyRole rejects a role not in the allowed list', async () => {
    const supportRole = await makeRole('support');
    const support = await makeUser('support2@rbac.test', supportRole.id);
    await expect(requireAnyRole(support.id, ['administrator', 'super_admin'])).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('super_admin is implicitly granted every permission, with no admin_role_permissions row needed', async () => {
    const superAdminRole = await makeRole(SUPER_ADMIN_ROLE);
    const superAdmin = await makeUser('super@rbac.test', superAdminRole.id);

    // No permission row was ever created for 'anything.whatsoever' —
    // this is exactly the implicit-grant behavior src/lib/rbac.ts
    // documents, not a database fixture bug.
    expect(await userHasPermission(superAdmin.id, 'anything.whatsoever')).toBe(true);
    await expect(requirePermission(superAdmin.id, 'anything.whatsoever')).resolves.toBeUndefined();
  });
});
