import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { orders, payments, manualPaymentSubmissions, products } from '@/db/schema';
import { resolvePrice, type ResolvedPrice } from './pricing';

// V1 is PKR-only per docs/LMS_V1_SCOPE.md — no country/currency picker yet,
// so checkout always resolves the PKR price. Multi-currency is designed in
// the schema (prices.currencyCode/countryCode) but not wired to a picker
// until that's actually scoped.
const CHECKOUT_CURRENCY = 'PKR';

export async function listPurchasableProducts(): Promise<Array<{ id: string; name: string; description: string | null; type: string; price: ResolvedPrice }>> {
  const productRows = await db.select().from(products).where(eq(products.status, 'active'));
  const results: Array<{ id: string; name: string; description: string | null; type: string; price: ResolvedPrice }> = [];
  for (const p of productRows) {
    const price = await resolvePrice(p.id, CHECKOUT_CURRENCY, null);
    if (price) results.push({ id: p.id, name: p.name, description: p.description, type: p.type, price });
  }
  return results;
}

export async function getPurchasableProduct(productId: string) {
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.status, 'active')));
  if (!product) return null;
  const price = await resolvePrice(productId, CHECKOUT_CURRENCY, null);
  if (!price) return null;
  return { product, price };
}

function generateOrderNumber(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

/**
 * Creates the order/payment/submission chain for a manual bank-transfer
 * claim — the amount charged is always the server-resolved price
 * (resolvePrice), never anything the client sent, per
 * docs/lms-security.md's "a payment success response cannot be faked from
 * the browser" rule. This only ever reaches `pending_verification` — an
 * admin approving it in /admin/payments (approveManualPayment) is the only
 * code path that flips it to paid and grants access.
 */
export async function submitManualBankTransfer(
  userId: string,
  productId: string,
  details: { transactionReference: string; amountClaimed: number; paymentDate: Date; receiptFileUrl?: string | null },
): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string }> {
  const resolved = await getPurchasableProduct(productId);
  if (!resolved) return { ok: false, error: 'This product is not currently available for purchase.' };
  const { price } = resolved;

  if (!details.transactionReference.trim()) return { ok: false, error: 'A transaction reference is required.' };

  const orderId = crypto.randomUUID();
  const orderNumber = generateOrderNumber();
  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    userId,
    productId,
    amount: price.amount,
    currencyCode: price.currencyCode,
    status: 'pending',
  });

  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    orderId,
    provider: 'manual_bank_transfer',
    amount: price.amount,
    currencyCode: price.currencyCode,
    method: 'manual_bank_transfer',
    status: 'pending_verification',
    idempotencyKey: crypto.randomUUID(),
  });

  await db.insert(manualPaymentSubmissions).values({
    id: crypto.randomUUID(),
    paymentId,
    transactionReference: details.transactionReference.trim(),
    amountClaimed: details.amountClaimed,
    paymentDate: details.paymentDate,
    receiptFileUrl: details.receiptFileUrl?.trim() || null,
    status: 'pending',
  });

  return { ok: true, orderNumber };
}
