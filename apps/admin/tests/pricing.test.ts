import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { currencyForCountry, decimalPlacesFor, formatCurrencyAmount, FALLBACK_CURRENCY } from '@/lib/pricing/currency';
import { convertFromUsd, getCachedRate } from '@/lib/pricing/fxRates';
import { listActivePlans, listActiveAddOns, getOrCreateConsultationSettings, getOrCreateSocReadinessSettings } from '@/lib/pricing/plans';
import { bookPaidConsultation } from '@/lib/pricing/consultationBooking';

afterAll(closeTestDb);

beforeEach(async () => {
  await truncateAll();
});

describe('currency', () => {
  it('maps every explicitly required country to its currency', () => {
    expect(currencyForCountry('PK')).toBe('PKR');
    expect(currencyForCountry('AE')).toBe('AED');
    expect(currencyForCountry('SA')).toBe('SAR');
    expect(currencyForCountry('QA')).toBe('QAR');
    expect(currencyForCountry('OM')).toBe('OMR');
    expect(currencyForCountry('GB')).toBe('GBP');
    expect(currencyForCountry('US')).toBe('USD');
    expect(currencyForCountry('CA')).toBe('CAD');
    expect(currencyForCountry('AU')).toBe('AUD');
    expect(currencyForCountry('DE')).toBe('EUR');
    expect(currencyForCountry('FR')).toBe('EUR');
  });

  it('falls back to USD for an unmapped or missing country', () => {
    expect(currencyForCountry('XX')).toBe(FALLBACK_CURRENCY);
    expect(currencyForCountry(null)).toBe(FALLBACK_CURRENCY);
    expect(currencyForCountry(undefined)).toBe(FALLBACK_CURRENCY);
  });

  it('uses the correct decimal places per currency', () => {
    expect(decimalPlacesFor('USD')).toBe(2);
    expect(decimalPlacesFor('JPY')).toBe(0);
    expect(decimalPlacesFor('OMR')).toBe(3);
    expect(decimalPlacesFor('BHD')).toBe(3);
  });

  it('formats amounts with locale-aware grouping and the right decimal count', () => {
    expect(formatCurrencyAmount(1499, 'USD')).toMatch(/\$\s?1,499/);
    expect(formatCurrencyAmount(1499, 'JPY')).not.toMatch(/\.\d/);
  });

  it('never throws for a currency code Intl might not fully recognize', () => {
    expect(() => formatCurrencyAmount(100, 'ZZZ')).not.toThrow();
  });
});

describe('fxRates', () => {
  it('USD always converts 1:1 without touching the cache', async () => {
    const result = await convertFromUsd(499, 'USD');
    expect(result).toMatchObject({ currencyCode: 'USD', amount: 499, rateToUsd: 1, isStale: false, usedFallback: false });
  });

  it('falls back to USD when the requested currency has no cached rate yet', async () => {
    const result = await convertFromUsd(499, 'PKR');
    expect(result.usedFallback).toBe(true);
    expect(result.currencyCode).toBe('USD');
    expect(result.amount).toBe(499);
  });

  it('converts using a cached rate once one exists', async () => {
    await testDb.insert(schema.fxRates).values({ currencyCode: 'AED', rateToUsd: '3.6725', fetchedAt: new Date() });
    const result = await convertFromUsd(100, 'AED');
    expect(result.usedFallback).toBe(false);
    expect(result.amount).toBeCloseTo(367.25, 2);
    expect(result.isStale).toBe(false);
  });

  it('flags a cached rate as stale once it is old enough', async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h ago, past the 36h staleness window
    await testDb.insert(schema.fxRates).values({ currencyCode: 'GBP', rateToUsd: '0.79', fetchedAt: old });
    const cached = await getCachedRate('GBP');
    expect(cached?.isStale).toBe(true);
  });
});

describe('plans/add-ons/settings', () => {
  it('listActivePlans only returns active plans, ordered by sortOrder', async () => {
    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();
    const id3 = crypto.randomUUID();
    await testDb.insert(schema.pricingPlans).values([
      { id: id1, slug: 'essential', name: 'Security Essential', status: 'active', sortOrder: 1, monthlyPriceUsd: '499.00' },
      { id: id2, slug: 'professional', name: 'Security Professional', status: 'active', sortOrder: 0, monthlyPriceUsd: '1499.00' },
      { id: id3, slug: 'draft-plan', name: 'Draft', status: 'draft', sortOrder: 2 },
    ]);
    const plans = await listActivePlans();
    expect(plans.map((p) => p.slug)).toEqual(['professional', 'essential']);
  });

  it('listActiveAddOns only returns active add-ons', async () => {
    await testDb.insert(schema.addOnServices).values([
      { id: crypto.randomUUID(), slug: 'web-assessment', name: 'Website Security Assessment', status: 'active', startingPriceUsd: '750.00' },
      { id: crypto.randomUUID(), slug: 'disabled-addon', name: 'Disabled', status: 'disabled' },
    ]);
    const addOns = await listActiveAddOns();
    expect(addOns.map((a) => a.slug)).toEqual(['web-assessment']);
  });

  it('getOrCreateConsultationSettings creates a default row once, reuses it after', async () => {
    const first = await getOrCreateConsultationSettings();
    const second = await getOrCreateConsultationSettings();
    expect(first.id).toBe(second.id);
    expect(Number(first.feeUsd)).toBeGreaterThan(0);
  });

  it('getOrCreateSocReadinessSettings defaults to disabled', async () => {
    const settings = await getOrCreateSocReadinessSettings();
    expect(settings.availability).toBe('disabled');
  });
});

describe('bookPaidConsultation', () => {
  it('creates a lead, consultation, invoice, and a pending (never succeeded) payment', async () => {
    const result = await bookPaidConsultation({
      fullName: 'Jane Doe',
      email: `jane-${crypto.randomUUID()}@example.com`,
      companyName: 'Acme Co',
      country: 'AE',
      countryDetectionSource: 'ip_api',
      companySize: 'small',
      preferredDateTime: new Date(Date.now() + 86400000),
      timezone: 'Asia/Dubai',
      displayedCurrency: 'USD',
    });

    expect(result.consultationId).toBeTruthy();
    expect(result.invoiceNumber).toMatch(/^INV-\d{4}$/);

    const [consultation] = await testDb.select().from(schema.consultations).where(eq(schema.consultations.id, result.consultationId));
    expect(consultation.status).toBe('requested');
    expect(consultation.paymentStatus).toBe('pending');
    expect(consultation.companyName).toBe('Acme Co');
    expect(consultation.companySize).toBe('small');
    expect(consultation.invoiceId).toBeTruthy();
    expect(consultation.paymentId).toBeTruthy();

    const [payment] = await testDb.select().from(schema.payments).where(eq(schema.payments.id, consultation.paymentId!));
    expect(payment.status).toBe('pending');
    expect(payment.provider).toBe('manual');

    const [invoice] = await testDb.select().from(schema.invoices).where(eq(schema.invoices.id, consultation.invoiceId!));
    expect(invoice.status).toBe('sent');
    expect(invoice.currency).toBe('USD');
  });

  it('reuses an existing customer record for a repeat email instead of creating a duplicate', async () => {
    const email = `repeat-${crypto.randomUUID()}@example.com`;
    await bookPaidConsultation({ fullName: 'First Visit', email, preferredDateTime: new Date(Date.now() + 86400000) });
    await bookPaidConsultation({ fullName: 'Second Visit', email, preferredDateTime: new Date(Date.now() + 172800000) });

    const matchingCustomers = await testDb.select().from(schema.customers).where(eq(schema.customers.email, email));
    expect(matchingCustomers).toHaveLength(1);
  });
});
