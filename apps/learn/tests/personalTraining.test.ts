import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import {
  ensurePersonalTrainingProduct,
  submitTrainingRequest,
  listMyTrainingRequests,
  getMyTrainingRequest,
  acceptTrainingRequestOffer,
} from '@/lib/personalTraining';
import { getPurchasableProduct } from '@/lib/checkout';

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, countryCode: 'PK' });
  return id;
}

async function makeActivePaymentMethod() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.paymentMethods).values({ id, name: 'Bank Transfer', type: 'bank_transfer', isActive: true });
  return id;
}

afterAll(closeTestDb);

describe('ensurePersonalTrainingProduct', () => {
  beforeEach(truncateAll);

  it('creates exactly one Personal Training product and is idempotent', async () => {
    const first = await ensurePersonalTrainingProduct();
    const second = await ensurePersonalTrainingProduct();
    expect(second.id).toBe(first.id);

    const rows = await testDb.select().from(schema.products).where(eq(schema.products.type, 'mentoring'));
    expect(rows).toHaveLength(1);
  });

  it('never gets a row in prices — the unconfigured/not-yet-announced price is represented by its absence', async () => {
    const product = await ensurePersonalTrainingProduct();
    const priceRows = await testDb.select().from(schema.prices).where(eq(schema.prices.productId, product.id));
    expect(priceRows).toHaveLength(0);
  });

  it('can never be bought through the ordinary catalog checkout path, because it has no resolvable price', async () => {
    const product = await ensurePersonalTrainingProduct();
    const resolved = await getPurchasableProduct(product.id);
    expect(resolved).toBeNull();
  });
});

describe('submitTrainingRequest', () => {
  beforeEach(truncateAll);

  const validInput = {
    contactName: 'Jane Student',
    contactEmail: 'jane@example.com',
    areaOfInterest: 'Web application penetration testing',
    experienceLevel: 'beginner' as const,
    goals: 'Get comfortable testing real web apps.',
  };

  it('creates a request with status "new" and never creates an order, payment, or price', async () => {
    const userId = await makeUser('jane@request.test');
    const result = await submitTrainingRequest(userId, validInput);
    expect(result.ok).toBe(true);

    const requests = await listMyTrainingRequests(userId);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.status).toBe('new');

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(orders).toHaveLength(0);
  });

  it('rejects a request with no goals', async () => {
    const userId = await makeUser('nogoals@request.test');
    const result = await submitTrainingRequest(userId, { ...validInput, goals: '   ' });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid experience level', async () => {
    const userId = await makeUser('badlevel@request.test');
    // @ts-expect-error -- deliberately invalid input, same as a tampered client request
    const result = await submitTrainingRequest(userId, { ...validInput, experienceLevel: 'master' });
    expect(result.ok).toBe(false);
  });
});

describe('training request ownership (IDOR)', () => {
  beforeEach(truncateAll);

  it("one student can never read another student's request", async () => {
    const ownerId = await makeUser('owner@idor.test');
    const attackerId = await makeUser('attacker@idor.test');
    const result = await submitTrainingRequest(ownerId, {
      contactName: 'Owner',
      contactEmail: 'owner@idor.test',
      areaOfInterest: 'Cloud security',
      experienceLevel: 'intermediate',
      goals: 'Learn cloud security basics.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(await getMyTrainingRequest(attackerId, result.id)).toBeNull();
    expect(await getMyTrainingRequest(ownerId, result.id)).not.toBeNull();
  });
});

describe('acceptTrainingRequestOffer', () => {
  beforeEach(truncateAll);

  async function makeApprovedRequest(userId: string, amountMinorUnits = 15000) {
    const product = await ensurePersonalTrainingProduct();
    const result = await submitTrainingRequest(userId, {
      contactName: 'Jane',
      contactEmail: 'jane@accept.test',
      areaOfInterest: 'Network security',
      experienceLevel: 'advanced',
      goals: 'Deep dive into network security.',
    });
    if (!result.ok) throw new Error('setup failed');
    await testDb
      .update(schema.trainingRequests)
      .set({ status: 'approved', agreedPriceAmount: amountMinorUnits, agreedCurrencyCode: 'USD' })
      .where(eq(schema.trainingRequests.id, result.id));
    return { requestId: result.id, productId: product.id };
  }

  it('refuses to accept a request that has no agreed price (status not approved)', async () => {
    const userId = await makeUser('noprice@accept.test');
    const submission = await submitTrainingRequest(userId, {
      contactName: 'Jane',
      contactEmail: 'jane@accept.test',
      areaOfInterest: 'X',
      experienceLevel: 'beginner',
      goals: 'Y',
    });
    if (!submission.ok) throw new Error('setup failed');
    const methodId = await makeActivePaymentMethod();

    const result = await acceptTrainingRequestOffer(userId, submission.id, methodId, {
      transactionReference: 'REF1',
      amountClaimed: 100,
      paymentDate: new Date(),
    });
    expect(result.ok).toBe(false);
  });

  it('creates an order/payment at exactly the agreed price and marks the request converted', async () => {
    const userId = await makeUser('accept@accept.test');
    const { requestId, productId } = await makeApprovedRequest(userId, 15000);
    const methodId = await makeActivePaymentMethod();

    const result = await acceptTrainingRequestOffer(userId, requestId, methodId, {
      transactionReference: 'REF-123',
      amountClaimed: 150,
      paymentDate: new Date(),
    });
    expect(result.ok).toBe(true);

    const [order] = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(order?.amount).toBe(15000);
    expect(order?.productId).toBe(productId);
    expect(order?.status).toBe('pending');

    const [payment] = await testDb.select().from(schema.payments).where(eq(schema.payments.orderId, order!.id));
    expect(payment?.status).toBe('pending_verification');
    expect(payment?.amount).toBe(15000);

    const [updatedRequest] = await testDb.select().from(schema.trainingRequests).where(eq(schema.trainingRequests.id, requestId));
    expect(updatedRequest?.status).toBe('converted');
    expect(updatedRequest?.convertedOrderId).toBe(order!.id);
  });

  it('refuses a second accept attempt on an already-converted request (no duplicate order)', async () => {
    const userId = await makeUser('dup@accept.test');
    const { requestId } = await makeApprovedRequest(userId, 20000);
    const methodId = await makeActivePaymentMethod();

    const first = await acceptTrainingRequestOffer(userId, requestId, methodId, { transactionReference: 'A', amountClaimed: 200, paymentDate: new Date() });
    expect(first.ok).toBe(true);

    const second = await acceptTrainingRequestOffer(userId, requestId, methodId, { transactionReference: 'B', amountClaimed: 200, paymentDate: new Date() });
    expect(second.ok).toBe(false);

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, userId));
    expect(orders).toHaveLength(1);
  });

  it("refuses to accept another student's request", async () => {
    const ownerId = await makeUser('realowner@accept.test');
    const attackerId = await makeUser('attacker2@accept.test');
    const { requestId } = await makeApprovedRequest(ownerId, 15000);
    const methodId = await makeActivePaymentMethod();

    const result = await acceptTrainingRequestOffer(attackerId, requestId, methodId, {
      transactionReference: 'X',
      amountClaimed: 150,
      paymentDate: new Date(),
    });
    expect(result.ok).toBe(false);

    const orders = await testDb.select().from(schema.orders).where(eq(schema.orders.userId, attackerId));
    expect(orders).toHaveLength(0);
  });
});
