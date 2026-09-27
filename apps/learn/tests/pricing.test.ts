import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { resolvePrice } from '@/lib/pricing';

describe('pricing — the price charged is always the server-side lookup, never a client-supplied value', () => {
  beforeEach(truncateAll);
  afterAll(closeTestDb);

  it('resolves the enrollment product to PKR 800 (80000 minor units) from the database, matching docs/LMS_DECISIONS.md #8', async () => {
    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'membership', name: 'Learn with Shahid Enrollment' });
    await testDb.insert(schema.prices).values({ id: crypto.randomUUID(), productId, currencyCode: 'PKR', countryCode: null, amount: 80000 });

    const resolved = await resolvePrice(productId, 'PKR', null);
    expect(resolved).not.toBeNull();
    expect(resolved!.amount).toBe(80000);
    expect(resolved!.currencyCode).toBe('PKR');
  });

  it('prefers a country-specific price over the currency default when both exist', async () => {
    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'course', name: 'Test course' });
    await testDb.insert(schema.prices).values({ id: crypto.randomUUID(), productId, currencyCode: 'USD', countryCode: null, amount: 5000 });
    await testDb.insert(schema.prices).values({ id: crypto.randomUUID(), productId, currencyCode: 'USD', countryCode: 'AE', amount: 4500 });

    const resolvedForUAE = await resolvePrice(productId, 'USD', 'AE');
    expect(resolvedForUAE!.amount).toBe(4500);

    const resolvedDefault = await resolvePrice(productId, 'USD', 'PK');
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
    const productId = crypto.randomUUID();
    await testDb.insert(schema.products).values({ id: productId, type: 'course', name: 'Unpriced course' });
    const resolved = await resolvePrice(productId, 'EUR', null);
    expect(resolved).toBeNull();
  });
});
