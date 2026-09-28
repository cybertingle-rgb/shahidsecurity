import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { submitManualBankTransfer, listPurchasableProducts } from '@/lib/checkout';

/**
 * Phase 7's core security property, called out by name in
 * docs/LMS_IMPLEMENTATION_PLAN.md's testing scope: "a payment success
 * response cannot be faked from the browser" — and more specifically here,
 * the *amount* an order/payment records must always come from the
 * server-side `prices` table, never whatever a submitted form claims to
 * have paid.
 */

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, countryCode: 'PK' });
  return id;
}

async function makeActiveProductWithPrice(amount: number) {
  const productId = crypto.randomUUID();
  await testDb.insert(schema.products).values({ id: productId, type: 'membership', name: 'Test membership', status: 'active' });
  await testDb.insert(schema.prices).values({ id: crypto.randomUUID(), productId, currencyCode: 'PKR', countryCode: null, amount, isActive: true });
  return productId;
}

afterAll(closeTestDb);

describe('Checkout — manual bank transfer', () => {
  beforeEach(truncateAll);

  it('lists only active products that have an active PKR price', async () => {
    const productId = await makeActiveProductWithPrice(80000);
    const draftProductId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: draftProductId, type: 'course', name: 'Unpublished', status: 'draft' });

    const list = await listPurchasableProducts();
    const ids = list.map((p) => p.id);
    expect(ids).toContain(productId);
    expect(ids).not.toContain(draftProductId);
  });

  it('records the order/payment amount from the server-side price, ignoring the amountClaimed field entirely', async () => {
    const userId = await makeUser('buyer@checkout.test');
    const productId = await makeActiveProductWithPrice(80000); // PKR 800.00

    const result = await submitManualBankTransfer(userId, productId, {
      transactionReference: 'TXN123',
      amountClaimed: 1, // a lowballed/faked claim — must never become the recorded charge
      paymentDate: new Date(),
    });
    expect(result.ok).toBe(true);

    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(order?.amount).toBe(80000);
    expect(order?.status).toBe('pending');

    const [payment] = await testDb.select().from(schema.payments).where(eq(schema.payments.orderId, order!.id));
    expect(payment?.amount).toBe(80000);
    expect(payment?.status).toBe('pending_verification');
    expect(payment?.method).toBe('manual_bank_transfer');

    const [submission] = await testDb.select().from(schema.manualPaymentSubmissions).where(eq(schema.manualPaymentSubmissions.paymentId, payment!.id));
    expect(submission?.amountClaimed).toBe(1); // the claim itself is stored for the admin to see, just never trusted
    expect(submission?.status).toBe('pending');
  });

  it('refuses to create an order for a product with no active price', async () => {
    const userId = await makeUser('nopriceBuyer@checkout.test');
    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'course', name: 'No price set', status: 'active' });

    const result = await submitManualBankTransfer(userId, productId, { transactionReference: 'TXN', amountClaimed: 500, paymentDate: new Date() });
    expect(result.ok).toBe(false);

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(orders).toHaveLength(0);
  });

  it('rejects a non-finite amountClaimed or invalid paymentDate without throwing', async () => {
    const userId = await makeUser('badinput@checkout.test');
    const productId = await makeActiveProductWithPrice(50000);

    const badAmount = await submitManualBankTransfer(userId, productId, { transactionReference: 'TXN', amountClaimed: NaN, paymentDate: new Date() });
    expect(badAmount.ok).toBe(false);

    const badDate = await submitManualBankTransfer(userId, productId, { transactionReference: 'TXN', amountClaimed: 500, paymentDate: new Date('not-a-date') });
    expect(badDate.ok).toBe(false);

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(orders).toHaveLength(0);
  });

  it('rejects a submission with a blank transaction reference', async () => {
    const userId = await makeUser('blankref@checkout.test');
    const productId = await makeActiveProductWithPrice(50000);

    const result = await submitManualBankTransfer(userId, productId, { transactionReference: '   ', amountClaimed: 500, paymentDate: new Date() });
    expect(result.ok).toBe(false);
  });
});
