import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { users, roles, userRoles, oauthAccounts } from '@/db/schema';
import { hashPassword } from './password';
import { env } from '@/lib/env';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const GOOGLE_OAUTH_STATE_COOKIE = 'lws_google_oauth_state';

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID ?? '');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

type GoogleTokenResponse = { access_token: string; token_type: string; expires_in: number };

// Authorization-code flow, exchanged server-to-server with the client
// secret — this is what makes the resulting access_token trustworthy
// without needing to verify a JWT signature locally: only Google and this
// server (which holds GOOGLE_CLIENT_SECRET) can ever produce/exchange a
// valid code, so the profile fetched with the token it returns is
// necessarily Google's own answer, not something a browser could forge.
export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      code,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) {
    // Google's error body (e.g. "redirect_uri_mismatch", "invalid_client")
    // is the single most useful diagnostic for this call — surfaced in the
    // server log, never to the browser.
    const body = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${res.status} ${body}`);
  }
  return res.json();
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string | null };

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google userinfo fetch failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
  if (!data.email) throw new Error('Google account has no email');
  return { sub: data.sub, email: data.email.toLowerCase(), emailVerified: Boolean(data.email_verified), name: data.name ?? null };
}

export type ResolvedGoogleUser = { id: string; email: string; fullName: string; status: 'active' | 'suspended' };

/**
 * Find-or-create/link. A previously linked oauth_accounts row wins first —
 * matched on Google's `sub`, not email, since a Google account's email can
 * change but its `sub` can't. Otherwise an existing password-based user
 * with the same address is linked automatically: safe specifically because
 * `emailVerified` here means Google itself has confirmed control of that
 * inbox, the same trust bar this app's own email-verification step sets.
 * A brand-new user is created pre-verified for the same reason. Never
 * links/creates against an unverified Google email.
 */
export async function resolveOrCreateGoogleUser(profile: GoogleProfile): Promise<ResolvedGoogleUser | { error: string }> {
  if (!profile.emailVerified) {
    return { error: 'google_email_unverified' };
  }

  const [linked] = await db
    .select({ userId: oauthAccounts.userId })
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.providerAccountId, profile.sub)))
    .limit(1);

  if (linked) {
    const [user] = await db.select().from(users).where(eq(users.id, linked.userId)).limit(1);
    if (!user) return { error: 'account_not_found' };
    return { id: user.id, email: user.email, fullName: user.fullName, status: user.status };
  }

  const [existingByEmail] = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
  if (existingByEmail) {
    await db.insert(oauthAccounts).values({ userId: existingByEmail.id, provider: 'google', providerAccountId: profile.sub });
    if (!existingByEmail.emailVerifiedAt) {
      await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, existingByEmail.id));
    }
    return { id: existingByEmail.id, email: existingByEmail.email, fullName: existingByEmail.fullName, status: existingByEmail.status };
  }

  // A random, never-communicated password hash — this account can only be
  // signed into via Google, or via "forgot password", which still requires
  // proving control of the same inbox Google just verified.
  const passwordHash = await hashPassword(crypto.randomUUID());
  const userId = crypto.randomUUID();
  const fullName = profile.name?.trim() || profile.email;

  await db.insert(users).values({ id: userId, email: profile.email, passwordHash, fullName, emailVerifiedAt: new Date() });

  const [studentRole] = await db.select().from(roles).where(eq(roles.name, 'student')).limit(1);
  if (studentRole) {
    await db.insert(userRoles).values({ userId, roleId: studentRole.id });
  }

  await db.insert(oauthAccounts).values({ userId, provider: 'google', providerAccountId: profile.sub });

  return { id: userId, email: profile.email, fullName, status: 'active' };
}
