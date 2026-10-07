import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { listPaymentMethods, listActivePaymentMethods, getPaymentMethod } from '@/lib/paymentMethods';

afterAll(closeTestDb);

async function insertMethod(overrides: Partial<typeof schema.manualPaymentMethods.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.manualPaymentMethods).values({
    id,
    name: 'Bank Transfer',
    type: 'bank_transfer',
    isActive: true,
    sortOrder: 0,
    ...overrides,
  });
  return id;
}

describe('paymentMethods', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('listPaymentMethods returns every method ordered by sortOrder, active or not', async () => {
    await insertMethod({ name: 'Second', sortOrder: 1 });
    await insertMethod({ name: 'First', sortOrder: 0 });
    await insertMethod({ name: 'Inactive one', sortOrder: 2, isActive: false });

    const methods = await listPaymentMethods();
    expect(methods.map((m) => m.name)).toEqual(['First', 'Second', 'Inactive one']);
  });

  it('listActivePaymentMethods excludes inactive ones', async () => {
    await insertMethod({ name: 'Active', isActive: true, sortOrder: 0 });
    await insertMethod({ name: 'Inactive', isActive: false, sortOrder: 1 });

    const methods = await listActivePaymentMethods();
    expect(methods.map((m) => m.name)).toEqual(['Active']);
  });

  it('getPaymentMethod returns null for a method that does not exist', async () => {
    expect(await getPaymentMethod(crypto.randomUUID())).toBeNull();
  });

  it('getPaymentMethod returns the real row, including wallet address and instructions', async () => {
    const id = await insertMethod({
      name: 'Bitcoin',
      type: 'crypto',
      walletAddress: 'bc1pexampleaddress',
      instructions: 'BTC only, network fee is on the client.',
    });

    const method = await getPaymentMethod(id);
    expect(method?.walletAddress).toBe('bc1pexampleaddress');
    expect(method?.instructions).toBe('BTC only, network fee is on the client.');
    expect(method?.type).toBe('crypto');
  });
});
