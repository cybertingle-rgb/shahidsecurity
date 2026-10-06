import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { requirePermission } from '@/lib/rbac';
import { buildGoogleAuthUrl, googleOAuthConfigured, isGoogleScopeName, GOOGLE_OAUTH_STATE_COOKIE } from '@/lib/google/oauth';

/**
 * Starts the Google OAuth flow for one scope (business_profile |
 * analytics | search_console). The state value is stored in a
 * short-lived, httpOnly cookie and checked byte-for-byte against what
 * Google sends back to /api/google/callback — the standard OAuth CSRF
 * defense (an attacker who tricks an admin into visiting a callback URL
 * with the attacker's own authorization code can't also forge this
 * cookie). See docs/GOOGLE_INTEGRATION_SETUP.md.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ scope: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  await requirePermission(user.id, 'google.manage');

  const { scope } = await params;
  if (!isGoogleScopeName(scope)) {
    return NextResponse.json({ error: 'Unknown scope' }, { status: 400 });
  }

  if (!googleOAuthConfigured) {
    return NextResponse.json({ error: 'Google OAuth is not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI unset).' }, { status: 503 });
  }

  const state = `${scope}.${randomBytes(24).toString('base64url')}`;
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(buildGoogleAuthUrl(scope, state));
}
