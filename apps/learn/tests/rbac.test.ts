import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { requirePermission, requireAnyRole, userHasPermission, ForbiddenError } from '@/lib/rbac';

// MySQL has no RETURNING clause, so every fixture here generates its id
// with crypto.randomUUID() up front and uses that value directly.

async function makeRole(name: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.roles).values({ id, name });
  return { id, name };
}

async function makeRoleWithPermission(roleName: string, permissionKey: string) {
  const role = await makeRole(roleName);
  const permissionId = crypto.randomUUID();
  await testDb.insert(schema.permissions).values({ id: permissionId, key: permissionKey });
  await testDb.insert(schema.rolePermissions).values({ roleId: role.id, permissionId });
  return role;
}

async function makeUser(email: string, roleId?: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email });
  if (roleId) {
    await testDb.insert(schema.userRoles).values({ userId: id, roleId });
  }
  return { id, email };
}

afterAll(closeTestDb);

describe('RBAC — permissions are re-read from the database, not trusted from a claim', () => {
  beforeEach(truncateAll);

  it('grants access to a user whose role has the permission', async () => {
    const adminRole = await makeRoleWithPermission('admin', 'courses.publish');
    const admin = await makeUser('admin@rbac.test', adminRole.id);

    expect(await userHasPermission(admin.id, 'courses.publish')).toBe(true);
    await expect(requirePermission(admin.id, 'courses.publish')).resolves.toBeUndefined();
  });

  it('denies access to a user without the permission — the exact "non-admin cannot reach an admin action" case', async () => {
    await makeRoleWithPermission('admin', 'courses.publish');
    const studentRole = await makeRole('student');
    const student = await makeUser('student@rbac.test', studentRole.id);

    expect(await userHasPermission(student.id, 'courses.publish')).toBe(false);
    await expect(requirePermission(student.id, 'courses.publish')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('denies access to a user with no role at all', async () => {
    const user = await makeUser('noroles@rbac.test');
    await expect(requirePermission(user.id, 'courses.publish')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('requireAnyRole rejects a role not in the allowed list', async () => {
    const studentRole = await makeRole('student');
    const student = await makeUser('student2@rbac.test', studentRole.id);
    await expect(requireAnyRole(student.id, ['admin', 'super_admin'])).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('IDOR prevention — scoped queries never leak another user\'s data', () => {
  beforeEach(truncateAll);

  it('Student A cannot retrieve Student B\'s enrollment via a user-scoped query', async () => {
    const studentA = await makeUser('student.a@idor.test');
    const studentB = await makeUser('student.b@idor.test');

    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'membership', name: 'Test product' });
    const enrollmentBId = crypto.randomUUID();
    await testDb.insert(schema.enrollments).values({ id: enrollmentBId, userId: studentB.id, productId, source: 'manual_admin_grant' });

    // The IDOR-safe pattern from docs/lms-security.md: always scope by
    // (user_id AND id), never by id alone. Student A attempting to read
    // Student B's specific enrollment row this way finds nothing.
    const result = await testDb
      .select()
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.userId, studentA.id), eq(schema.enrollments.id, enrollmentBId)));

    expect(result).toHaveLength(0);

    // Sanity check: the same scoped-query shape correctly finds Student B's
    // own enrollment when Student B is the one asking.
    const ownResult = await testDb
      .select()
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.userId, studentB.id), eq(schema.enrollments.id, enrollmentBId)));
    expect(ownResult).toHaveLength(1);
  });
});
