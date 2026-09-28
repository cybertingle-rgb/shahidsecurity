import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { isGoogleOAuthConfigured, buildGoogleAuthUrl, GOOGLE_OAUTH_STATE_COOKIE } from '@/lib/auth/google';

/**
 * Kicks off the authorization-code flow: mint a one-time CSRF `state`
 * value, stash it in a short-lived httpOnly cookie, and send the browser
 * to Google. SameSite=Lax still lets this cookie ride back on the
 * top-level GET navigation Google sends the browser on afterward
 * (/api/auth/google/callback), which is what the callback checks it
 * against.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url));
  }

  const state = randomBytes(24).toString('base64url');
  const response = NextResponse.redirect(buildGoogleAuthUrl(state));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return response;
}
