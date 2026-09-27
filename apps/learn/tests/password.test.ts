import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('round-trips: a hash verifies against its own plaintext', async () => {
    const hash = await hashPassword('CorrectHorseBattery9');
    expect(await verifyPassword('CorrectHorseBattery9', hash)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('CorrectHorseBattery9');
    expect(await verifyPassword('WrongPassword123', hash)).toBe(false);
  });

  it('never stores the password in plaintext', async () => {
    const password = 'CorrectHorseBattery9';
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
  });

  it('is not a fast, unsalted hash — two hashes of the same password differ', async () => {
    const hashA = await hashPassword('SamePassword12345');
    const hashB = await hashPassword('SamePassword12345');
    expect(hashA).not.toBe(hashB);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-real-hash')).toBe(false);
  });
});
