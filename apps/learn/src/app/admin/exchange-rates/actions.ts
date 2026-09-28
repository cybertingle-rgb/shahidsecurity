'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { exchangeRates } from '@/db/schema';
import { requireAdminAction } from '@/lib/admin/guard';
import { logAudit } from '@/lib/audit';
import { invalidateExchangeRateCache, BASE_CURRENCY } from '@/lib/currency';

export async function setExchangeRate(formData: FormData) {
  const admin = await requireAdminAction('settings.manage');

  const currencyCode = String(formData.get('currencyCode') ?? '').trim().toUpperCase();
  const rate = Number(formData.get('rate'));
  if (!currencyCode || currencyCode.length !== 3) throw new Error('Currency code must be a 3-letter ISO 4217 code.');
  if (currencyCode === BASE_CURRENCY) throw new Error(`${BASE_CURRENCY} is the base currency and doesn't need a rate.`);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Rate must be a positive number.');

  const [existing] = await db.select({ id: exchangeRates.id }).from(exchangeRates).where(eq(exchangeRates.currencyCode, currencyCode));
  if (existing) {
    await db.update(exchangeRates).set({ rate: rate.toString(), updatedAt: new Date() }).where(eq(exchangeRates.id, existing.id));
  } else {
    await db.insert(exchangeRates).values({ id: crypto.randomUUID(), currencyCode, rate: rate.toString() });
  }

  invalidateExchangeRateCache();
  await logAudit({ actorUserId: admin.id, action: 'exchange_rate.set', targetType: 'exchange_rate', targetId: currencyCode, metadata: { rate } });
  revalidatePath('/admin/exchange-rates');
}

export async function deleteExchangeRate(id: string) {
  const admin = await requireAdminAction('settings.manage');
  await db.delete(exchangeRates).where(eq(exchangeRates.id, id));
  invalidateExchangeRateCache();
  await logAudit({ actorUserId: admin.id, action: 'exchange_rate.deleted', targetType: 'exchange_rate', targetId: id });
  revalidatePath('/admin/exchange-rates');
}
