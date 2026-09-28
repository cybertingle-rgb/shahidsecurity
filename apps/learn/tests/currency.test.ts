import { describe, it, expect } from 'vitest';
import { currencyForCountry, convertFromUsd, BASE_CURRENCY } from '@/lib/currency';

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
