'use server';

import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users, roles, userRoles, enrollments } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { destroyAllSessionsForUser } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { sendEmail, authEmailHtml } from '@/lib/email';
import { env } from '@/lib/env';
import { grantProductAccess, revokeProductAccess, resolveCourseIdForProduct } from '@/lib/enrollment';

/**
 * Admin "Add Student" — collects only name + email, never a password. A
 * random, never-communicated placeholder hash is stored so the account
 * can't be logged into until the student follows the activation link,
 * which reuses the same single-use password-reset token + /reset-password
 * page as self-service "forgot password" (docs/lms-security.md: no admin
 * ever sees or sets a real student password).
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

  const token = await createPasswordResetToken(userId);
  const activateUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
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

  await logAudit({ actorUserId: admin.id, action: 'student.invited', targetType: 'user', targetId: userId, metadata: { email } });
  revalidatePath('/admin/students');
}

export async function suspendStudent(userId: string) {
  const admin = await requireAdminAction('users.manage');
  await db.update(users).set({ status: 'suspended' }).where(eq(users.id, userId));
  // A suspended account shouldn't keep an already-open session either.
  await destroyAllSessionsForUser(userId);
  await logAudit({ actorUserId: admin.id, action: 'student.suspended', targetType: 'user', targetId: userId });
  revalidatePath(`/admin/students/${userId}`);
  revalidatePath('/admin/students');
}

export async function reactivateStudent(userId: string) {
  const admin = await requireAdminAction('users.manage');
  await db.update(users).set({ status: 'active' }).where(eq(users.id, userId));
  await logAudit({ actorUserId: admin.id, action: 'student.reactivated', targetType: 'user', targetId: userId });
  revalidatePath(`/admin/students/${userId}`);
  revalidatePath('/admin/students');
}

export async function manualEnroll(userId: string, formData: FormData) {
  const admin = await requireAdminAction('enrollments.manage');

  const explicitCourseId = (formData.get('courseId') as string) || null;
  const productId = (formData.get('productId') as string) || null;
  if (!explicitCourseId && !productId) {
    throw new Error('Select a course or a product to enroll into.');
  }
  // If the admin picked a course-type product (and didn't also separately
  // pick a course), resolve its linked course automatically — same rule
  // the payment-approval path uses, so a manual grant can never end up in
  // the "paid/granted but not visible in My Courses" state either.
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

  // A granted product can carry side effects beyond the enrollment row
  // itself — a membership product also needs a `memberships` row (that's
  // what /dashboard/membership actually reads), and either kind of product
  // can flip a gated community from not_eligible to eligible.
  if (productId) {
    await grantProductAccess(userId, productId);
  }

  await logAudit({
    actorUserId: admin.id,
    action: 'enrollment.manual_grant',
    targetType: 'enrollment',
    targetId: enrollmentId,
    metadata: { studentUserId: userId, courseId, productId },
  });

  revalidatePath(`/admin/students/${userId}`);
}

export async function revokeEnrollment(enrollmentId: string, studentUserId: string) {
  const admin = await requireAdminAction('enrollments.manage');

  const [enrollment] = await db.select({ productId: enrollments.productId }).from(enrollments).where(eq(enrollments.id, enrollmentId));
  await db.update(enrollments).set({ status: 'revoked' }).where(eq(enrollments.id, enrollmentId));
  if (enrollment?.productId) {
    await revokeProductAccess(studentUserId, enrollment.productId);
  }

  await logAudit({ actorUserId: admin.id, action: 'enrollment.revoked', targetType: 'enrollment', targetId: enrollmentId, metadata: { studentUserId } });
  revalidatePath(`/admin/students/${studentUserId}`);
}
