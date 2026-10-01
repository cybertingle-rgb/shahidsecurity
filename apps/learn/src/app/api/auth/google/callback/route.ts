import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { authEvents, users } from '@/db/schema';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { env } from '@/lib/env';
import {
  isGoogleOAuthConfigured,
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleCode,
  fetchGoogleProfile,
  resolveOrCreateGoogleUser,
} from '@/lib/auth/google';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

// Every redirect this route issues is built from env.NEXT_PUBLIC_APP_URL,
// never from the incoming request's own Host (request.url/request.nextUrl)
// — behind Hostinger's reverse proxy the Node process sees its own
// internal bind address (0.0.0.0:3000) as the request host, not the real
// public domain, so a request.url-based redirect sends the browser to an
// address it can't even connect to. NEXT_PUBLIC_APP_URL is the one
// explicitly-configured source of truth for this app's public URL (same
// one used to build the Google redirect_uri itself).
function toLogin(error: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?error=${error}`, env.NEXT_PUBLIC_APP_URL));
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return toLogin('google_not_configured');
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const userAgent = request.headers.get('user-agent');

  // Same dual-purpose defense as the password login route: caps both a
  // single attacker hammering this endpoint and (incidentally) runaway
  // retries from a misconfigured client.
  const allowed = await checkRateLimit(`oauth:google:ip:${ip}`, { maxAttempts: 20, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return toLogin('too_many_attempts');
  }

  const { searchParams } = new URL(request.url);
  const googleError = searchParams.get('error');
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (googleError) {
    return toLogin('google_denied');
  }
  // A missing/mismatched state means this request didn't originate from
  // the redirect this server itself sent to Google — refuse rather than
  // trusting a `code` we can't tie back to a request we started.
  if (!code || !state || !cookieState || state !== cookieState) {
    return toLogin('oauth_state');
  }

  // Each external/DB step gets its own try/catch and its own error code —
  // the code that ends up in the browser's address bar is then itself a
  // diagnostic (which step failed), not just a generic "something broke",
  // since production server logs aren't something this session can see.
  let tokens;
  try {
    tokens = await exchangeGoogleCode(code);
  } catch (err) {
    console.error('Google OAuth: token exchange failed', err);
    return toLogin('google_token_exchange_failed');
  }

  let profile;
  try {
    profile = await fetchGoogleProfile(tokens.access_token);
  } catch (err) {
    console.error('Google OAuth: profile fetch failed', err);
    return toLogin('google_profile_fetch_failed');
  }

  let result;
  try {
    result = await resolveOrCreateGoogleUser(profile);
  } catch (err) {
    console.error('Google OAuth: resolveOrCreateGoogleUser failed', err);
    return toLogin('google_account_error');
  }

  if ('error' in result) {
    return toLogin(result.error);
  }
  if (result.status !== 'active') {
    return toLogin('account_suspended');
  }

  try {
    const roleNames = await getUserRoleNames(result.id);
    const isAdmin = [...roleNames].some((name) => ADMIN_ROLE_NAMES.has(name));
    const { token, expiresAt } = await createSession(result.id, { isAdmin, ipAddress: ip, userAgent });
    await setSessionCookie(token, expiresAt);

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, result.id));
    await db.insert(authEvents).values({ userId: result.id, eventType: 'login_success', ipAddress: ip, userAgent, metadata: { provider: 'google' } });

    const response = NextResponse.redirect(new URL('/dashboard', env.NEXT_PUBLIC_APP_URL));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error('Google OAuth: session creation failed', err);
    return toLogin('google_session_error');
  }
}
