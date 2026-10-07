import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { seedSuperAdmin } from '@/lib/seedSuperAdmin';
import { listAdminUsers, getAdminUserById, listRoles, countOtherActiveSuperAdmins, emailInUseByOtherUser } from '@/lib/adminUsers';
import { hashPassword } from '@/lib/auth/password';

afterAll(closeTestDb);

async function createAdministrator(email: string): Promise<string> {
  const [role] = await testDb.select().from(schema.adminRoles).where(eq(schema.adminRoles.name, 'administrator'));
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword('a-real-strong-password-123');
  await testDb.insert(schema.adminUsers).values({ id, email, passwordHash, fullName: 'Test Admin', status: 'active' });
  if (role) await testDb.insert(schema.adminUserRoles).values({ userId: id, roleId: role.id });
  return id;
}

describe('adminUsers', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('listAdminUsers returns every account with its role names attached', async () => {
    await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');
    await createAdministrator('second@shahidiqbal.com');

    const users = await listAdminUsers();
    expect(users).toHaveLength(2);
    const superAdmin = users.find((u) => u.email === 'info@shahidiqbal.com');
    expect(superAdmin?.roles).toEqual(['super_admin']);
    const admin = users.find((u) => u.email === 'second@shahidiqbal.com');
    expect(admin?.roles).toEqual(['administrator']);
  });

  it('getAdminUserById returns null for an account that does not exist', async () => {
    expect(await getAdminUserById(crypto.randomUUID())).toBeNull();
  });

  it('listRoles returns the full seeded role catalog', async () => {
    await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');
    const roles = await listRoles();
    expect(roles.map((r) => r.name).sort()).toEqual(['administrator', 'editor', 'finance', 'seo_manager', 'super_admin', 'support']);
  });

  it('countOtherActiveSuperAdmins excludes the given user and suspended accounts', async () => {
    await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');
    const [first] = await testDb.select().from(schema.adminUsers);

    // Only one super admin exists — excluding them leaves zero others.
    expect(await countOtherActiveSuperAdmins(first!.id)).toBe(0);

    // Add a second super admin.
    const [superAdminRole] = await testDb.select().from(schema.adminRoles).where(eq(schema.adminRoles.name, 'super_admin'));
    const secondId = crypto.randomUUID();
    const passwordHash = await hashPassword('a-real-strong-password-123');
    await testDb.insert(schema.adminUsers).values({ id: secondId, email: 'second@shahidiqbal.com', passwordHash, fullName: 'Second', status: 'active' });
    await testDb.insert(schema.adminUserRoles).values({ userId: secondId, roleId: superAdminRole!.id });

    expect(await countOtherActiveSuperAdmins(first!.id)).toBe(1);

    // Suspending the second one should make it not count anymore.
    await testDb.update(schema.adminUsers).set({ status: 'suspended' }).where(eq(schema.adminUsers.id, secondId));
    expect(await countOtherActiveSuperAdmins(first!.id)).toBe(0);
  });

  it('emailInUseByOtherUser is true only for a DIFFERENT account using that email', async () => {
    await seedSuperAdmin('info@shahidiqbal.com', 'a-real-strong-password-123');
    const [user] = await testDb.select().from(schema.adminUsers);

    expect(await emailInUseByOtherUser('info@shahidiqbal.com', user!.id)).toBe(false);
    expect(await emailInUseByOtherUser('info@shahidiqbal.com', crypto.randomUUID())).toBe(true);
    expect(await emailInUseByOtherUser('unused@shahidiqbal.com', user!.id)).toBe(false);
  });
});
