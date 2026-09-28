'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users, enrollments } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { destroyAllSessionsForUser } from '@/lib/auth/session';
import { grantProductAccess, revokeProductAccess } from '@/lib/enrollment';

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

  const courseId = (formData.get('courseId') as string) || null;
  const productId = (formData.get('productId') as string) || null;
  if (!courseId && !productId) {
    throw new Error('Select a course or a product to enroll into.');
  }

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
