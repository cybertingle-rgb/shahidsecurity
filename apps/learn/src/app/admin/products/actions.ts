'use server';

import { eq, and, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { products, prices } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';

type ProductType = 'course' | 'membership' | 'bundle' | 'workshop' | 'bootcamp' | 'mentoring' | 'digital_product' | 'live_class';

export async function createProduct(formData: FormData) {
  const admin = await requireAdminAction('products.manage');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'membership') as ProductType;
  // Course-type products are auto-managed from the course form itself
  // (syncCourseProduct) — this screen never creates one directly, so a
  // course can never end up with two disconnected commerce records.
  if (type === 'course') throw new Error('Course pricing is set on the course itself (Admin → Courses → edit a course), not here.');

  const id = crypto.randomUUID();
  await db.insert(products).values({
    id,
    type,
    name,
    description: String(formData.get('description') ?? '') || null,
    status: 'draft',
  });

  await logAudit({ actorUserId: admin.id, action: 'product.created', targetType: 'product', targetId: id, metadata: { name, type } });
  redirect(`/admin/products/${id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const admin = await requireAdminAction('products.manage');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const status = String(formData.get('status') ?? 'draft') as 'draft' | 'active' | 'inactive';

  await db
    .update(products)
    .set({ name, description: String(formData.get('description') ?? '') || null, status, updatedAt: new Date() })
    .where(eq(products.id, id));

  await logAudit({ actorUserId: admin.id, action: 'product.updated', targetType: 'product', targetId: id, metadata: { status } });
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin/products');
}

export async function addPrice(productId: string, formData: FormData) {
  const admin = await requireAdminAction('prices.manage');

  const currencyCode = String(formData.get('currencyCode') ?? '')
    .trim()
    .toUpperCase();
  const countryCode = (String(formData.get('countryCode') ?? '').trim().toUpperCase() || null) as string | null;
  const amountMajorUnits = Number(formData.get('amount'));
  if (!currencyCode || currencyCode.length !== 3) throw new Error('Currency code must be a 3-letter ISO 4217 code.');
  if (!Number.isFinite(amountMajorUnits) || amountMajorUnits <= 0) throw new Error('Amount must be a positive number.');

  // Stored in minor units (e.g. paisa/cents) — the form takes a normal
  // amount (e.g. "800") and converts once, here, server-side. Never
  // hardcode a specific product's price anywhere in this codebase.
  const amount = Math.round(amountMajorUnits * 100);

  const [existing] = await db
    .select({ id: prices.id })
    .from(prices)
    .where(
      and(
        eq(prices.productId, productId),
        eq(prices.currencyCode, currencyCode),
        countryCode ? eq(prices.countryCode, countryCode) : isNull(prices.countryCode),
      ),
    );

  if (existing) {
    // Refresh the existing row rather than violating the (product,
    // currency, country) unique index with a duplicate.
    await db.update(prices).set({ amount, isActive: true }).where(eq(prices.id, existing.id));
  } else {
    await db.insert(prices).values({ id: crypto.randomUUID(), productId, currencyCode, countryCode, amount, isActive: true });
  }

  await logAudit({
    actorUserId: admin.id,
    action: 'price.set',
    targetType: 'product',
    targetId: productId,
    metadata: { currencyCode, countryCode, amount },
  });
  revalidatePath(`/admin/products/${productId}`);
}

export async function deactivatePrice(priceId: string, productId: string) {
  const admin = await requireAdminAction('prices.manage');
  await db.update(prices).set({ isActive: false }).where(eq(prices.id, priceId));
  await logAudit({ actorUserId: admin.id, action: 'price.deactivated', targetType: 'price', targetId: priceId, metadata: { productId } });
  revalidatePath(`/admin/products/${productId}`);
}
