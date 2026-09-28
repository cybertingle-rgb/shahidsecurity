import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { currencyForCountry, convertFromUsd, getUsdExchangeRates, invalidateExchangeRateCache, BASE_CURRENCY } from '@/lib/currency';

describe('currencyForCountry', () => {
  it('maps a known country to its currency', () => {
    expect(currencyForCountry('PK')).toBe('PKR');
    expect(currencyForCountry('US')).toBe('USD');
    expect(currencyForCountry('AE')).toBe('AED');
  });

  it('falls back to USD for an unlisted or missing country', () => {
    expect(currencyForCountry('XX')).toBe('USD');
    expect(currencyForCountry(null)).toBe('USD');
  });
});

describe('convertFromUsd', () => {
  it('returns the amount unchanged when the target currency is already USD', () => {
    expect(convertFromUsd(80000, BASE_CURRENCY, { PKR: 280 })).toEqual({ amount: 80000, currencyCode: 'USD' });
  });

  it('converts using the given rate, rounding to the nearest minor unit', () => {
    expect(convertFromUsd(80000, 'PKR', { PKR: 280 })).toEqual({ amount: 22400000, currencyCode: 'PKR' });
  });

  it('falls back to USD (never a wrong number) when no rate is available for the target currency', () => {
    expect(convertFromUsd(80000, 'PKR', {})).toEqual({ amount: 80000, currencyCode: 'USD' });
  });
});

describe('getUsdExchangeRates — admin-set, not a live fetch', () => {
  beforeEach(async () => {
    await truncateAll();
    invalidateExchangeRateCache();
  });
  afterAll(closeTestDb);

  it('reads whatever rate the admin last set, exactly as entered', async () => {
    await testDb.insert(schema.exchangeRates).values({ id: crypto.randomUUID(), currencyCode: 'PKR', rate: '285.500000' });

    const rates = await getUsdExchangeRates();
    expect(rates.PKR).toBe(285.5);
  });

  it('returns an empty table (meaning: only USD renders) when no admin has set any rate', async () => {
    const rates = await getUsdExchangeRates();
    expect(rates).toEqual({});
  });
});
