'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { adminUsers, adminRoles, adminUserRoles } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { hashPassword } from '@/lib/auth/password';
import { destroyAllSessionsForUser } from '@/lib/auth/session';
import { getUserRoleNames, SUPER_ADMIN_ROLE } from '@/lib/rbac';
import { countOtherActiveSuperAdmins, emailInUseByOtherUser, getAdminUserById } from '@/lib/adminUsers';

export async function createAdminUser(formData: FormData) {
  const admin = await requireAdminAction('users.manage');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('fullName') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const roleId = String(formData.get('roleId') ?? '');

  if (!email) throw new Error('Email is required.');
  if (!fullName) throw new Error('Full name is required.');
  if (password.length < 12) throw new Error('Password must be at least 12 characters.');
  if (!roleId) throw new Error('A role is required.');

  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) throw new Error('An account with that email already exists.');

  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.id, roleId)).limit(1);
  if (!role) throw new Error('Role not found.');

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  await db.insert(adminUsers).values({ id, email, passwordHash, fullName, status: 'active' });
  await db.insert(adminUserRoles).values({ userId: id, roleId });

  await logAudit({
    actorUserId: admin.id,
    action: 'admin_user.created',
    targetType: 'admin_user',
    targetId: id,
    metadata: { email, role: role.name },
  });

  redirect('/dashboard/users');
}

export async function updateAdminUserProfile(id: string, formData: FormData) {
  const admin = await requireAdminAction('users.manage');
  const current = await getAdminUserById(id);
  if (!current) throw new Error('Account not found.');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('fullName') ?? '').trim();
  if (!email) throw new Error('Email is required.');
  if (!fullName) throw new Error('Full name is required.');

  if (await emailInUseByOtherUser(email, id)) {
    throw new Error('Another account already uses that email.');
  }

  await db.update(adminUsers).set({ email, fullName, updatedAt: new Date() }).where(eq(adminUsers.id, id));

  await logAudit({
    actorUserId: admin.id,
    action: 'admin_user.profile_updated',
    targetType: 'admin_user',
    targetId: id,
    metadata: { previousEmail: current.email, newEmail: email },
  });

  revalidatePath(`/dashboard/users/${id}`);
  revalidatePath('/dashboard/users');
}

export async function setAdminUserRole(id: string, roleId: string) {
  const admin = await requireAdminAction('users.manage');
  const current = await getAdminUserById(id);
  if (!current) throw new Error('Account not found.');

  const [role] = await db.select().from(adminRoles).where(eq(adminRoles.id, roleId)).limit(1);
  if (!role) throw new Error('Role not found.');

  const currentRoles = await getUserRoleNames(id);
  if (currentRoles.has(SUPER_ADMIN_ROLE) && role.name !== SUPER_ADMIN_ROLE) {
    const remaining = await countOtherActiveSuperAdmins(id);
    if (remaining === 0) {
      throw new Error('Cannot change this role — it is the last active Super Admin account.');
    }
  }

  await db.delete(adminUserRoles).where(eq(adminUserRoles.userId, id));
  await db.insert(adminUserRoles).values({ userId: id, roleId });

  await logAudit({
    actorUserId: admin.id,
    action: 'admin_user.role_changed',
    targetType: 'admin_user',
    targetId: id,
    metadata: { role: role.name },
  });

  revalidatePath(`/dashboard/users/${id}`);
  revalidatePath('/dashboard/users');
}

export async function setAdminUserStatus(id: string, status: 'active' | 'suspended') {
  const admin = await requireAdminAction('users.manage');
  const current = await getAdminUserById(id);
  if (!current) throw new Error('Account not found.');

  if (status === 'suspended' && current.roles.includes(SUPER_ADMIN_ROLE)) {
    const remaining = await countOtherActiveSuperAdmins(id);
    if (remaining === 0) {
      throw new Error('Cannot suspend the last active Super Admin account.');
    }
  }

  await db.update(adminUsers).set({ status, updatedAt: new Date() }).where(eq(adminUsers.id, id));
  if (status === 'suspended') {
    await destroyAllSessionsForUser(id);
  }

  await logAudit({
    actorUserId: admin.id,
    action: `admin_user.status_changed.${status}`,
    targetType: 'admin_user',
    targetId: id,
  });

  revalidatePath(`/dashboard/users/${id}`);
  revalidatePath('/dashboard/users');
}
