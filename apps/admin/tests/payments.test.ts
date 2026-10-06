import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { getTotalPaidForInvoice, nextInvoiceNumber } from '@/lib/payments';

afterAll(closeTestDb);

async function makeCustomer() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.customers).values({ id, fullName: 'Test Customer', email: 'customer@payments.test' });
  return id;
}

describe('invoice payment totals', () => {
  beforeEach(truncateAll);

  it('sums multiple succeeded payments correctly', async () => {
    const customerId = await makeCustomer();
    const invoiceId = crypto.randomUUID();
    await testDb.insert(schema.invoices).values({ id: invoiceId, customerId, invoiceNumber: 'INV-TEST-1', currency: 'USD', amountDue: '500.00', status: 'sent' });

    await testDb.insert(schema.payments).values({ id: crypto.randomUUID(), invoiceId, customerId, provider: 'manual', amount: '200.00', currency: 'USD', status: 'succeeded' });
    await testDb.insert(schema.payments).values({ id: crypto.randomUUID(), invoiceId, customerId, provider: 'manual', amount: '300.00', currency: 'USD', status: 'succeeded' });

    expect(await getTotalPaidForInvoice(invoiceId)).toBe(500);
  });

  it('returns 0 for an invoice with no payments yet', async () => {
    const customerId = await makeCustomer();
    const invoiceId = crypto.randomUUID();
    await testDb.insert(schema.invoices).values({ id: invoiceId, customerId, invoiceNumber: 'INV-TEST-2', currency: 'USD', amountDue: '100.00', status: 'sent' });

    expect(await getTotalPaidForInvoice(invoiceId)).toBe(0);
  });

  it('generates sequential invoice numbers padded to 4 digits', async () => {
    const customerId = await makeCustomer();
    expect(await nextInvoiceNumber()).toBe('INV-0001');

    await testDb.insert(schema.invoices).values({ id: crypto.randomUUID(), customerId, invoiceNumber: 'INV-0001', currency: 'USD', amountDue: '1.00', status: 'draft' });
    expect(await nextInvoiceNumber()).toBe('INV-0002');
  });
});
