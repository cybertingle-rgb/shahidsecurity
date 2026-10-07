import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminUsers } from '@/db/schema';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { sendEmail, authEmailHtml } from '@/lib/email';
import { env } from '@/lib/env';
import { logAudit } from '@/lib/audit';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const allowed = await checkRateLimit(`admin-password-reset:${email}`, { maxAttempts: 5, windowMs: 60 * 60 * 1000 });

  // Always the same generic response, allowed or not, found or not — never
  // reveals whether an account exists via response content or timing-
  // distinguishable branches, same anti-enumeration reasoning as
  // apps/learn's identical route.
  const genericResponse = NextResponse.json(
    { message: 'If that email is registered, a password reset link has been sent.' },
    { status: 200 },
  );
  if (!allowed) return genericResponse;

  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const user = rows[0];
  if (!user) return genericResponse;

  const token = await createPasswordResetToken(user.id);
  const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    email,
    'Reset your Shahid Security admin password',
    `Reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
    authEmailHtml({
      heading: 'Reset your password',
      intro: 'We received a request to reset your Shahid Security admin password. This link expires in 1 hour.',
      buttonLabel: 'Reset password',
      buttonUrl: resetUrl,
      footer: "If you didn't request this, you can safely ignore this email.",
    }),
  );
  await logAudit({ actorUserId: user.id, action: 'admin_user.password_reset_requested', targetType: 'admin_user', targetId: user.id, ipAddress: ip });

  return genericResponse;
}
