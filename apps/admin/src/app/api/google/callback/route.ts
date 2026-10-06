import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth/session';
import { requirePermission } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { exchangeGoogleCode, fetchGoogleAccountEmail, isGoogleScopeName, GOOGLE_OAUTH_STATE_COOKIE } from '@/lib/google/oauth';
import { upsertConnection } from '@/lib/google/connections';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (errorParam) {
    return NextResponse.redirect(new URL(`/dashboard/google?error=${encodeURIComponent(errorParam)}`, request.url));
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/dashboard/google?error=invalid_state', request.url));
  }

  const scope = state.split('.')[0];
  if (!scope || !isGoogleScopeName(scope)) {
    return NextResponse.redirect(new URL('/dashboard/google?error=invalid_scope', request.url));
  }
  await requirePermission(user.id, 'google.manage');

  try {
    const tokens = await exchangeGoogleCode(code);
    const googleAccountEmail = await fetchGoogleAccountEmail(tokens.access_token);

    await upsertConnection(scope, {
      googleAccountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresInSeconds: tokens.expires_in,
      grantedScopes: tokens.scope,
    });

    // Never log the token values themselves — only that a connection
    // happened, for which scope, and which Google account (an identity
    // fact, not a secret).
    await logAudit({ actorUserId: user.id, action: 'google_connection.connected', targetType: 'google_connection', targetId: scope, metadata: { scope, googleAccountEmail } });

    return NextResponse.redirect(new URL('/dashboard/google?connected=1', request.url));
  } catch (err) {
    await logAudit({ actorUserId: user.id, action: 'google_connection.connect_failed', targetType: 'google_connection', targetId: scope, metadata: { scope } });
    return NextResponse.redirect(new URL(`/dashboard/google?error=${encodeURIComponent(err instanceof Error ? err.message : 'unknown_error')}`, request.url));
  }
}
