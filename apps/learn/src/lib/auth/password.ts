import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const KEY_LENGTH = 64;
// N=2^15 costs ~64MB of memory per hash, in line with OWASP's scrypt
// guidance for interactive login — deliberately chosen over argon2
// (Node's own built-in, no native binary) since the app deploys to a
// shared-hosting Node runtime whose support for compiled native modules
// hasn't been verified (see docs/lms-architecture.md's 2026-09-27 hosting
// update). Never plaintext, never a fast hash — see docs/lms-security.md.
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1 };
// Node's crypto.scrypt refuses to run above its default 32MB `maxmem` guard,
// and this N/r combination needs (128 * N * r) bytes almost exactly at that
// boundary — so maxmem must be set explicitly, generously above the actual
// requirement, not left at the default.
function maxmemFor(params: { N: number; r: number }): number {
  return 128 * params.N * params.r * 2;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, { ...SCRYPT_PARAMS, maxmem: maxmemFor(SCRYPT_PARAMS) });
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 6) return false;
  const [scheme, nStr, rStr, pStr, saltHex, keyHex] = parts as [string, string, string, string, string, string];
  if (scheme !== 'scrypt') return false;

  const params = { N: Number(nStr), r: Number(rStr), p: Number(pStr) };
  const salt = Buffer.from(saltHex, 'hex');
  const expectedKey = Buffer.from(keyHex, 'hex');

  const derivedKey = await scrypt(password, salt, expectedKey.length, { ...params, maxmem: maxmemFor(params) });
  if (derivedKey.length !== expectedKey.length) return false;
  return timingSafeEqual(derivedKey, expectedKey);
}
