'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { courses } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';

type CourseStatus = 'draft' | 'review' | 'published' | 'archived';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function createCourse(formData: FormData) {
  const admin = await requireAdminAction('courses.create');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');
  const instructorId = (formData.get('instructorId') as string) || null;
  const level = String(formData.get('level') ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert';

  const id = crypto.randomUUID();
  let slug = slugify(title);
  const [existing] = await db.select({ id: courses.id }).from(courses).where(eq(courses.slug, slug));
  if (existing) slug = `${slug}-${id.slice(0, 8)}`;

  await db.insert(courses).values({
    id,
    title,
    slug,
    shortDescription: String(formData.get('shortDescription') ?? '') || null,
    instructorId,
    level,
    status: 'draft',
  });

  await logAudit({ actorUserId: admin.id, action: 'course.created', targetType: 'course', targetId: id, metadata: { title } });
  redirect(`/admin/courses/${id}`);
}

export async function updateCourse(id: string, formData: FormData) {
  const admin = await requireAdminAction('courses.update');

  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Title is required.');
  const instructorId = (formData.get('instructorId') as string) || null;
  const level = String(formData.get('level') ?? 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert';

  await db
    .update(courses)
    .set({
      title,
      shortDescription: String(formData.get('shortDescription') ?? '') || null,
      fullDescription: String(formData.get('fullDescription') ?? '') || null,
      instructorId,
      level,
      updatedAt: new Date(),
    })
    .where(eq(courses.id, id));

  await logAudit({ actorUserId: admin.id, action: 'course.updated', targetType: 'course', targetId: id });
  revalidatePath(`/admin/courses/${id}`);
}

export async function setCourseStatus(id: string, status: CourseStatus) {
  // Publishing specifically needs its own permission — a deliberate admin
  // action, never automatic — per docs/lms-admin-guide.md's content
  // workflow rule. Draft/review/archived transitions use the broader
  // courses.update permission.
  const admin = await requireAdminAction(status === 'published' ? 'courses.publish' : 'courses.update');

  await db
    .update(courses)
    .set({ status, publishedAt: status === 'published' ? new Date() : undefined, updatedAt: new Date() })
    .where(eq(courses.id, id));

  await logAudit({ actorUserId: admin.id, action: `course.status_changed.${status}`, targetType: 'course', targetId: id });
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath('/admin/courses');
}
