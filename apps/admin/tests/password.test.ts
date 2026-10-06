import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('verifies a correct password against its own hash', async () => {
    const hash = await hashPassword('a real password 123');
    expect(await verifyPassword('a real password 123', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('a real password 123');
    expect(await verifyPassword('the wrong password', hash)).toBe(false);
  });

  it('never stores the password in plaintext in the hash string', async () => {
    const hash = await hashPassword('super-secret-value');
    expect(hash).not.toContain('super-secret-value');
  });

  it('produces a different hash for the same password each time (random salt)', async () => {
    const hash1 = await hashPassword('same password');
    const hash2 = await hashPassword('same password');
    expect(hash1).not.toBe(hash2);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-real-hash')).toBe(false);
  });
});
