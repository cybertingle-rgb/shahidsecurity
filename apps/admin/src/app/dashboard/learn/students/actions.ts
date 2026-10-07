'use server';

import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { users, roles, userRoles, enrollments } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';
import { destroyAllLearnSessionsForUser } from '@/lib/learn/sessions';
import { hashPassword } from '@/lib/auth/password';
import { createLearnPasswordResetToken } from '@/lib/learn/tokens';
import { sendEmail, authEmailHtml } from '@/lib/email';
import { env } from '@/lib/env';
import { grantProductAccess, revokeProductAccess, resolveCourseIdForProduct } from '@/lib/learn/enrollment';

/**
 * Ported from apps/learn/src/app/admin/students/actions.ts. Every
 * `logLearnAudit` call below passes actorUserId: null — the acting
 * admin is a row in THIS app's own adminUsers table, not Learn's users
 * table, so there is no valid Learn-side user id to attribute the
 * action to (that table has a real FK to users.id). The admin's email
 * goes into metadata instead, so the audit trail still says who did it.
 */
export async function inviteStudent(formData: FormData) {
  const admin = await requireAdminAction('users.manage');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('fullName') ?? '').trim();
  if (!email || !fullName) throw new Error('Name and email are required.');

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) throw new Error('A user with that email already exists.');

  const passwordHash = await hashPassword(randomBytes(32).toString('base64url'));
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email, passwordHash, fullName, emailVerifiedAt: new Date() });

  const [studentRole] = await db.select().from(roles).where(eq(roles.name, 'student')).limit(1);
  if (studentRole) {
    await db.insert(userRoles).values({ userId, roleId: studentRole.id });
  }

  const token = await createLearnPasswordResetToken(userId);
  const activateUrl = `${env.LEARN_APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    email,
    "You've been added to Learn with Shahid",
    `An account has been created for you. Set your password to activate it: ${activateUrl}\nThis link expires in 1 hour.`,
    authEmailHtml({
      heading: 'Welcome to Learn with Shahid',
      intro: `An account has been created for you (${fullName}). Set your password to activate it. This link expires in 1 hour.`,
      buttonLabel: 'Set your password',
      buttonUrl: activateUrl,
    }),
  );

  await logLearnAudit({ actorUserId: null, action: 'student.invited', targetType: 'user', targetId: userId, metadata: { email, adminActorEmail: admin.email } });
  revalidatePath('/dashboard/learn/students');
}

/** Profile fields only — never password or status, which stay on their own dedicated actions. */
export async function updateStudentProfile(userId: string, formData: FormData) {
  const admin = await requireAdminAction('users.manage');

  const fullName = String(formData.get('fullName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!fullName || !email) throw new Error('Name and email are required.');
  const countryCode = String(formData.get('countryCode') ?? '').trim().toUpperCase() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing && existing.id !== userId) throw new Error('Another user already uses that email.');

  await db.update(users).set({ fullName, email, countryCode, phone, updatedAt: new Date() }).where(eq(users.id, userId));

  await logLearnAudit({ actorUserId: null, action: 'student.profile_updated', targetType: 'user', targetId: userId, metadata: { email, adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/students/${userId}`);
  revalidatePath('/dashboard/learn/students');
}

export async function suspendStudent(userId: string) {
  const admin = await requireAdminAction('users.manage');
  await db.update(users).set({ status: 'suspended' }).where(eq(users.id, userId));
  await destroyAllLearnSessionsForUser(userId);
  await logLearnAudit({ actorUserId: null, action: 'student.suspended', targetType: 'user', targetId: userId, metadata: { adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/students/${userId}`);
  revalidatePath('/dashboard/learn/students');
}

export async function reactivateStudent(userId: string) {
  const admin = await requireAdminAction('users.manage');
  await db.update(users).set({ status: 'active' }).where(eq(users.id, userId));
  await logLearnAudit({ actorUserId: null, action: 'student.reactivated', targetType: 'user', targetId: userId, metadata: { adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/students/${userId}`);
  revalidatePath('/dashboard/learn/students');
}

export async function manualEnroll(userId: string, formData: FormData) {
  const admin = await requireAdminAction('enrollments.manage');

  const explicitCourseId = (formData.get('courseId') as string) || null;
  const productId = (formData.get('productId') as string) || null;
  if (!explicitCourseId && !productId) {
    throw new Error('Select a course or a product to enroll into.');
  }
  const courseId = explicitCourseId ?? (productId ? await resolveCourseIdForProduct(productId) : null);

  const enrollmentId = crypto.randomUUID();
  await db.insert(enrollments).values({
    id: enrollmentId,
    userId,
    courseId,
    productId,
    source: 'manual_admin_grant',
    status: 'active',
  });

  if (productId) {
    await grantProductAccess(userId, productId);
  }

  await logLearnAudit({
    actorUserId: null,
    action: 'enrollment.manual_grant',
    targetType: 'enrollment',
    targetId: enrollmentId,
    metadata: { studentUserId: userId, courseId, productId, adminActorEmail: admin.email },
  });

  revalidatePath(`/dashboard/learn/students/${userId}`);
}

export async function revokeEnrollment(enrollmentId: string, studentUserId: string) {
  const admin = await requireAdminAction('enrollments.manage');

  const [enrollment] = await db.select({ userId: enrollments.userId, productId: enrollments.productId }).from(enrollments).where(eq(enrollments.id, enrollmentId));
  await db.update(enrollments).set({ status: 'revoked' }).where(eq(enrollments.id, enrollmentId));
  if (enrollment?.productId) {
    await revokeProductAccess(enrollment.userId, enrollment.productId);
  }

  await logLearnAudit({
    actorUserId: null,
    action: 'enrollment.revoked',
    targetType: 'enrollment',
    targetId: enrollmentId,
    metadata: { studentUserId: enrollment?.userId ?? studentUserId, adminActorEmail: admin.email },
  });
  revalidatePath(`/dashboard/learn/students/${studentUserId}`);
}
