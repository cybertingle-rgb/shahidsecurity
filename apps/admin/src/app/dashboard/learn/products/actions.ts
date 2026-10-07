'use server';

import { eq, and, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { products, prices } = learnSchema;
import { requireAdminAction } from '@/lib/learn/guard';
import { logLearnAudit } from '@/lib/learn/audit';

type ProductType = 'course' | 'membership' | 'bundle' | 'workshop' | 'bootcamp' | 'mentoring' | 'digital_product' | 'live_class';

export async function createProduct(formData: FormData) {
  const admin = await requireAdminAction('products.manage');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name is required.');
  const type = String(formData.get('type') ?? 'membership') as ProductType;
  if (type === 'course') throw new Error('Course pricing is set on the course itself (Learn Admin → Courses → edit a course), not here.');

  const id = crypto.randomUUID();
  await db.insert(products).values({
    id,
    type,
    name,
    description: String(formData.get('description') ?? '') || null,
    status: 'draft',
  });

  await logLearnAudit({ actorUserId: null, action: 'product.created', targetType: 'product', targetId: id, metadata: { name, type, adminActorEmail: admin.email } });
  redirect(`/dashboard/learn/products/${id}`);
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

  await logLearnAudit({ actorUserId: null, action: 'product.updated', targetType: 'product', targetId: id, metadata: { status, adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/products/${id}`);
  revalidatePath('/dashboard/learn/products');
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
    await db.update(prices).set({ amount, isActive: true }).where(eq(prices.id, existing.id));
  } else {
    await db.insert(prices).values({ id: crypto.randomUUID(), productId, currencyCode, countryCode, amount, isActive: true });
  }

  await logLearnAudit({
    actorUserId: null,
    action: 'price.set',
    targetType: 'product',
    targetId: productId,
    metadata: { currencyCode, countryCode, amount, adminActorEmail: admin.email },
  });
  revalidatePath(`/dashboard/learn/products/${productId}`);
}

export async function deactivatePrice(priceId: string, productId: string) {
  const admin = await requireAdminAction('prices.manage');
  await db.update(prices).set({ isActive: false }).where(eq(prices.id, priceId));
  await logLearnAudit({ actorUserId: null, action: 'price.deactivated', targetType: 'price', targetId: priceId, metadata: { productId, adminActorEmail: admin.email } });
  revalidatePath(`/dashboard/learn/products/${productId}`);
}
