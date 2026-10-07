import { randomBytes, createHash } from 'node:crypto';
import { learnDb as db, learnSchema } from '@/db/learnDb';
const { passwordResetTokens } = learnSchema;

const PASSWORD_RESET_HOURS = 1;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Ported from apps/learn/src/lib/auth/tokens.ts (password-reset half
 * only — this app never needs email verification tokens). The resulting
 * token is consumed by Learn's own /reset-password page on
 * learn.shahidiqbal.com, which is why inviteStudent builds its activation
 * link from LEARN_APP_URL, not this app's own URL.
 */
export async function createLearnPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000),
  });
  return token;
}
