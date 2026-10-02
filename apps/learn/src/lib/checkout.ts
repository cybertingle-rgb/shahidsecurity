import { eq, and, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { orders, payments, manualPaymentSubmissions, products, prices, paymentMethods, enrollments } from '@/db/schema';
import { resolvePrice, type ResolvedPrice } from './pricing';
import { BASE_CURRENCY } from './currency';
import { resolveCourseIdForProduct, grantProductAccess } from './enrollment';

// The admin always enters/updates a product's price in USD — that single
// row is the source of truth every visitor's local-currency display and
// every order/payment record derives from (lib/currency.ts converts for
// *display* only; the ledger itself always stays in USD, unaffected by
// which currency a page happened to show someone at the time).
const CHECKOUT_CURRENCY = BASE_CURRENCY;

/**
 * One batched query for every active product's price, not one resolvePrice
 * call per product (Phase 13 perf pass — the original loop was a real N+1
 * against the catalog page). Safe to specialize this way *only* because
 * listPurchasableProducts always resolves with countryCode=null — the
 * per-product checkout path (getPurchasableProduct, below) keeps using the
 * general resolvePrice() since a single lookup has nothing to batch.
 */
export async function listPurchasableProducts(): Promise<Array<{ id: string; name: string; description: string | null; type: string; price: ResolvedPrice }>> {
  const productRows = await db.select().from(products).where(eq(products.status, 'active'));
  const productIds = productRows.map((p) => p.id);
  if (productIds.length === 0) return [];

  const priceRows = await db
    .select()
    .from(prices)
    .where(and(inArray(prices.productId, productIds), eq(prices.currencyCode, CHECKOUT_CURRENCY), isNull(prices.countryCode), eq(prices.isActive, true)));
  const priceByProductId = new Map(priceRows.map((p) => [p.productId, p]));

  const results: Array<{ id: string; name: string; description: string | null; type: string; price: ResolvedPrice }> = [];
  for (const p of productRows) {
    const priceRow = priceByProductId.get(p.id);
    if (!priceRow) continue;
    results.push({
      id: p.id,
      name: p.name,
      description: p.description,
      type: p.type,
      price: { amount: priceRow.saleAmount ?? priceRow.amount, currencyCode: priceRow.currencyCode, priceId: priceRow.id },
    });
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
 * Creates the order/payment/submission chain for a manual payment claim
 * against whichever admin-defined payment method the student picked (bank
 * transfer, crypto, mobile wallet, ...). The amount charged is always the
 * server-resolved USD price (resolvePrice), never anything the client
 * sent, per docs/lms-security.md's "a payment success response cannot be
 * faked from the browser" rule. This only ever reaches
 * `pending_verification` — an admin approving it in /admin/payments
 * (approveManualPayment) is the only code path that flips it to paid and
 * grants access.
 */
export async function submitManualPayment(
  userId: string,
  productId: string,
  paymentMethodId: string,
  details: { transactionReference: string; amountClaimed: number; paymentDate: Date; receiptFileUrl?: string | null },
): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string }> {
  const resolved = await getPurchasableProduct(productId);
  if (!resolved) return { ok: false, error: 'This product is not currently available for purchase.' };
  const { price } = resolved;

  const [method] = await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.isActive, true)));
  if (!method) return { ok: false, error: 'That payment method is not available.' };

  if (!details.transactionReference.trim()) return { ok: false, error: 'A transaction reference is required.' };
  if (!Number.isFinite(details.amountClaimed) || details.amountClaimed < 0) return { ok: false, error: 'Enter a valid amount.' };
  if (Number.isNaN(details.paymentDate.getTime())) return { ok: false, error: 'Enter a valid payment date.' };

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
    provider: method.type,
    amount: price.amount,
    currencyCode: price.currencyCode,
    method: 'manual',
    paymentMethodId: method.id,
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

/**
 * Free-course self-enrollment — goes through the exact same order/payment/
 * enrollment tables as a real purchase (never a separate ad-hoc "just
 * insert an enrollment" shortcut), but every record is unambiguously
 * marked as $0 and `method: 'free'` so it can never be mistaken for a real
 * bank transfer or gateway charge in the payments ledger. Skips the
 * pending_verification step entirely — there's nothing for an admin to
 * verify when no money changed hands — and goes straight to paid/succeeded.
 *
 * Re-checks the resolved price is actually 0 server-side rather than
 * trusting the caller already confirmed the course is free, per the same
 * "never trust a client-asserted price" rule the paid path follows.
 */
export async function enrollInFreeCourse(userId: string, productId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const resolved = await getPurchasableProduct(productId);
  if (!resolved) return { ok: false, error: 'This course is not currently available.' };
  if (resolved.product.type !== 'course') return { ok: false, error: 'This is not a course.' };
  if (resolved.price.amount !== 0) return { ok: false, error: 'This course is not free.' };

  const [existing] = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(and(eq(enrollments.userId, userId), eq(enrollments.productId, productId), eq(enrollments.status, 'active')));
  if (existing) return { ok: true };

  const courseId = await resolveCourseIdForProduct(productId);
  const orderId = crypto.randomUUID();

  await db.insert(orders).values({
    id: orderId,
    orderNumber: generateOrderNumber(),
    userId,
    productId,
    amount: 0,
    currencyCode: CHECKOUT_CURRENCY,
    status: 'paid',
    paidAt: new Date(),
  });

  await db.insert(payments).values({
    id: crypto.randomUUID(),
    orderId,
    provider: 'free',
    amount: 0,
    currencyCode: CHECKOUT_CURRENCY,
    status: 'succeeded',
    method: 'free',
    idempotencyKey: crypto.randomUUID(),
  });

  await db.insert(enrollments).values({
    id: crypto.randomUUID(),
    userId,
    courseId,
    productId,
    source: 'purchase',
    status: 'active',
  });

  await grantProductAccess(userId, productId);

  return { ok: true };
}
