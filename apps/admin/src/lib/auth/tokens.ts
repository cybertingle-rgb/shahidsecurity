import { randomBytes, createHash } from 'node:crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { db } from '@/db';
import { adminPasswordResetTokens } from '@/db/schema';

const PASSWORD_RESET_HOURS = 1;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(adminPasswordResetTokens).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000),
  });
  return token;
}

/** Single-use: consuming a valid token marks it used in the same call. Returns null for an invalid, expired, or already-used token. */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(adminPasswordResetTokens)
    .where(and(eq(adminPasswordResetTokens.tokenHash, tokenHash), isNull(adminPasswordResetTokens.usedAt), gt(adminPasswordResetTokens.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.update(adminPasswordResetTokens).set({ usedAt: new Date() }).where(eq(adminPasswordResetTokens.id, row.id));
  return row.userId;
}
