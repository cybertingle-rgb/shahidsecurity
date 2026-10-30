'use server';

import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { addOnServices } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';

type AddOnStatus = 'draft' | 'active' | 'disabled';

function parseAddOnFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const slug = String(formData.get('slug') ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Slug is required.');

  const startingPriceUsdRaw = String(formData.get('startingPriceUsd') ?? '').trim();
  if (startingPriceUsdRaw && (Number.isNaN(Number(startingPriceUsdRaw)) || Number(startingPriceUsdRaw) < 0)) {
    throw new Error('Starting price must be a valid non-negative number, or left blank for "Custom Quote".');
  }

  return {
    slug,
    name,
    description: String(formData.get('description') ?? '').trim() || null,
    startingPriceUsd: startingPriceUsdRaw || null,
  };
}

export async function createAddOnService(formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const fields = parseAddOnFields(formData);

  const [{ count } = { count: 0 }] = await db.select({ count: sql<number>`count(*)` }).from(addOnServices);

  const id = crypto.randomUUID();
  await db.insert(addOnServices).values({ id, ...fields, status: 'draft', sortOrder: Number(count) });

  await logAudit({ actorUserId: admin.id, action: 'add_on_service.created', targetType: 'add_on_service', targetId: id, metadata: { slug: fields.slug } });
  revalidatePath('/dashboard/pricing/add-ons');
  revalidatePath('/dashboard/pricing');
}

export async function updateAddOnService(id: string, formData: FormData) {
  const admin = await requireAdminAction('pricing.manage');
  const fields = parseAddOnFields(formData);

  await db.update(addOnServices).set(fields).where(eq(addOnServices.id, id));

  await logAudit({ actorUserId: admin.id, action: 'add_on_service.updated', targetType: 'add_on_service', targetId: id, metadata: { slug: fields.slug } });
  revalidatePath('/dashboard/pricing/add-ons');
  revalidatePath('/dashboard/pricing');
}

export async function setAddOnServiceStatus(id: string, status: AddOnStatus) {
  const admin = await requireAdminAction('pricing.manage');
  await db.update(addOnServices).set({ status }).where(eq(addOnServices.id, id));
  await logAudit({ actorUserId: admin.id, action: 'add_on_service.status_changed', targetType: 'add_on_service', targetId: id, metadata: { status } });
  revalidatePath('/dashboard/pricing/add-ons');
  revalidatePath('/dashboard/pricing');
}

export async function deleteAddOnService(id: string) {
  const admin = await requireAdminAction('pricing.manage');
  await db.delete(addOnServices).where(eq(addOnServices.id, id));
  await logAudit({ actorUserId: admin.id, action: 'add_on_service.deleted', targetType: 'add_on_service', targetId: id });
  revalidatePath('/dashboard/pricing/add-ons');
  revalidatePath('/dashboard/pricing');
}
