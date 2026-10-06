'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { services } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getServiceById, slugify } from '@/lib/services';

export async function createService(formData: FormData) {
  const admin = await requireAdminAction('services.manage');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');

  const id = crypto.randomUUID();
  let slug = slugify(name);
  const [existing] = await db.select({ id: services.id }).from(services).where(eq(services.slug, slug));
  if (existing) slug = `${slug}-${id.slice(0, 8)}`;

  await db.insert(services).values({
    id,
    slug,
    name,
    shortDescription: String(formData.get('shortDescription') ?? '').trim() || null,
    bodyMarkdown: String(formData.get('bodyMarkdown') ?? '').trim() || null,
    seoTitle: String(formData.get('seoTitle') ?? '').trim() || null,
    seoDescription: String(formData.get('seoDescription') ?? '').trim() || null,
    status: 'draft',
    createdByUserId: admin.id,
  });

  await logAudit({ actorUserId: admin.id, action: 'service.created', targetType: 'service', targetId: id, metadata: { name } });
  redirect(`/dashboard/business/services/${id}`);
}

export async function updateService(id: string, formData: FormData) {
  const admin = await requireAdminAction('services.manage');
  const current = await getServiceById(id);
  if (!current) throw new Error('Service not found.');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');

  await db
    .update(services)
    .set({
      name,
      shortDescription: String(formData.get('shortDescription') ?? '').trim() || null,
      bodyMarkdown: String(formData.get('bodyMarkdown') ?? '').trim() || null,
      seoTitle: String(formData.get('seoTitle') ?? '').trim() || null,
      seoDescription: String(formData.get('seoDescription') ?? '').trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(services.id, id));

  await logAudit({ actorUserId: admin.id, action: 'service.updated', targetType: 'service', targetId: id });
  revalidatePath(`/dashboard/business/services/${id}`);
}

export async function setServiceStatus(id: string, status: 'draft' | 'published') {
  const admin = await requireAdminAction('services.manage');
  await db.update(services).set({ status, updatedAt: new Date() }).where(eq(services.id, id));
  await logAudit({ actorUserId: admin.id, action: `service.status_changed.${status}`, targetType: 'service', targetId: id });
  revalidatePath(`/dashboard/business/services/${id}`);
  revalidatePath('/dashboard/business/services');
}

/**
 * Only a never-published draft can be deleted outright — once a service
 * has been live, it's archived (set back to draft) rather than erased,
 * per the brief's "prefer archive over destructive deletion where
 * historical data matters" rule. A service that was never published has
 * no historical/indexed footprint to preserve.
 */
export async function deleteService(id: string) {
  const admin = await requireAdminAction('services.manage');
  const current = await getServiceById(id);
  if (!current) return;
  if (current.status !== 'draft') {
    throw new Error('Only a draft (never-published) service can be deleted. Set it back to draft first if it was published.');
  }

  await db.delete(services).where(eq(services.id, id));
  await logAudit({ actorUserId: admin.id, action: 'service.deleted', targetType: 'service', targetId: id });
  revalidatePath('/dashboard/business/services');
}
