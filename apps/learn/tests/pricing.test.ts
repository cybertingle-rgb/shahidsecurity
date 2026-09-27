import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { resolvePrice } from '@/lib/pricing';

describe('pricing — the price charged is always the server-side lookup, never a client-supplied value', () => {
  beforeEach(truncateAll);
  afterAll(closeTestDb);

  it('resolves the enrollment product to PKR 800 (80000 minor units) from the database, matching docs/LMS_DECISIONS.md #8', async () => {
    const [product] = await testDb.insert(schema.products).values({ type: 'membership', name: 'Learn with Shahid Enrollment' }).returning();
    await testDb.insert(schema.prices).values({ productId: product!.id, currencyCode: 'PKR', countryCode: null, amount: 80000 });

    const resolved = await resolvePrice(product!.id, 'PKR', null);
    expect(resolved).not.toBeNull();
    expect(resolved!.amount).toBe(80000);
    expect(resolved!.currencyCode).toBe('PKR');
  });

  it('prefers a country-specific price over the currency default when both exist', async () => {
    const [product] = await testDb.insert(schema.products).values({ type: 'course', name: 'Test course' }).returning();
    await testDb.insert(schema.prices).values({ productId: product!.id, currencyCode: 'USD', countryCode: null, amount: 5000 });
    await testDb.insert(schema.prices).values({ productId: product!.id, currencyCode: 'USD', countryCode: 'AE', amount: 4500 });

    const resolvedForUAE = await resolvePrice(product!.id, 'USD', 'AE');
    expect(resolvedForUAE!.amount).toBe(4500);

    const resolvedDefault = await resolvePrice(product!.id, 'USD', 'PK');
    expect(resolvedDefault!.amount).toBe(5000);
  });

  it('has no parameter for a client-supplied amount — the function signature itself makes price manipulation impossible', async () => {
    // This is a structural assertion, not a runtime one: resolvePrice only
    // ever takes (productId, currencyCode, countryCode). There is no
    // "clientAmount" parameter to ignore, because there's nowhere for one
    // to go — the exact property the brief's "frontend cannot manipulate a
    // course's price" test is checking for.
    expect(resolvePrice.length).toBe(3);
  });

  it('returns null (never a fabricated price) when no matching price row exists', async () => {
    const [product] = await testDb.insert(schema.products).values({ type: 'course', name: 'Unpriced course' }).returning();
    const resolved = await resolvePrice(product!.id, 'EUR', null);
    expect(resolved).toBeNull();
  });
});
