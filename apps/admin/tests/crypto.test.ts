import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '@/lib/crypto';

describe('OAuth token encryption (AES-256-GCM)', () => {
  it('round-trips a plaintext value exactly', () => {
    const plaintext = 'a-real-looking-google-access-token-value';
    const encrypted = encryptSecret(plaintext);
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('the ciphertext never contains the plaintext value', () => {
    const plaintext = 'another-token-value-that-must-not-leak';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toContain(plaintext);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', () => {
    const encrypted1 = encryptSecret('same-value');
    const encrypted2 = encryptSecret('same-value');
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('rejects a tampered ciphertext rather than silently returning wrong data (GCM auth tag)', () => {
    const encrypted = encryptSecret('a value worth protecting');
    const tampered = encrypted.slice(0, -2) + (encrypted.slice(-2) === 'ff' ? '00' : 'ff');
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
