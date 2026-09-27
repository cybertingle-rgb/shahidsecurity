import { randomBytes, createHash } from 'node:crypto';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { db } from '@/db';
import { emailVerificationTokens, passwordResetTokens } from '@/db/schema';

const EMAIL_VERIFICATION_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_HOURS * 60 * 60 * 1000),
  });
  return token;
}

/** Single-use: consuming a valid token marks it used in the same call. */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.tokenHash, tokenHash), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, row.id));
  return row.userId;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000),
  });
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  return row.userId;
}
