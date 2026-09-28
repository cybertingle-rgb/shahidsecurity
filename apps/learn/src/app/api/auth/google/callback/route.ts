import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { authEvents, users } from '@/db/schema';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import {
  isGoogleOAuthConfigured,
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  resolveOrCreateGoogleUser,
} from '@/lib/auth/google';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

function toLogin(request: NextRequest, error: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return toLogin(request, 'google_not_configured');
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const userAgent = request.headers.get('user-agent');

  // Same dual-purpose defense as the password login route: caps both a
  // single attacker hammering this endpoint and (incidentally) runaway
  // retries from a misconfigured client.
  const allowed = await checkRateLimit(`oauth:google:ip:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return toLogin(request, 'too_many_attempts');
  }

  const { searchParams } = new URL(request.url);
  const googleError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (googleError) {
    return toLogin(request, 'google_denied');
  }
  // A missing/mismatched state means this request didn't originate from
  // the redirect this server itself sent to Google — refuse rather than
  // trusting a `code` we can't tie back to a request we started.
  if (!code || !state || !cookieState || state !== cookieState) {
    return toLogin(request, 'oauth_state');
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const result = await resolveOrCreateGoogleUser(profile);

    if ('error' in result) {
      return toLogin(request, result.error);
    }
    if (result.status !== 'active') {
      return toLogin(request, 'account_suspended');
    }

    const roleNames = await getUserRoleNames(result.id);
    const isAdmin = [...roleNames].some((name) => ADMIN_ROLE_NAMES.has(name));
    const { token, expiresAt } = await createSession(result.id, { isAdmin, ipAddress: ip, userAgent });
    await setSessionCookie(token, expiresAt);

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, result.id));
    await db.insert(authEvents).values({ userId: result.id, eventType: 'login_success', ipAddress: ip, userAgent, metadata: { provider: 'google' } });

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error('Google OAuth callback failed', err);
    return toLogin(request, 'google_error');
  }
}
