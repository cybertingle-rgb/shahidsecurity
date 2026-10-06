import { env, googleOAuthConfigured } from '@/lib/env';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export type GoogleScopeName = 'business_profile' | 'analytics' | 'search_console';

/**
 * Minimum-necessary OAuth scope per connection — never a broader one.
 * See docs/GOOGLE_INTEGRATION_SETUP.md for what each is actually used for.
 */
const GOOGLE_API_SCOPES: Record<GoogleScopeName, string> = {
  business_profile: 'https://www.googleapis.com/auth/business.manage',
  analytics: 'https://www.googleapis.com/auth/analytics.readonly',
  search_console: 'https://www.googleapis.com/auth/webmasters.readonly',
};

export function isGoogleScopeName(value: string): value is GoogleScopeName {
  return value === 'business_profile' || value === 'analytics' || value === 'search_console';
}

export { googleOAuthConfigured };

export const GOOGLE_OAUTH_STATE_COOKIE = 'ssa_google_oauth_state';

function redirectUri(): string {
  return env.GOOGLE_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/google/callback`;
}

/**
 * `access_type=offline` + `prompt=consent` are required to get a
 * refresh_token back — without them Google only issues a short-lived
 * access_token, which is useless for a background sync. This app-level
 * connection genuinely needs offline access (it reads Google's APIs
 * without an admin actively present), unlike apps/learn's "Continue
 * with Google" sign-in, which only ever needs `access_type=online`.
 */
export function buildGoogleAuthUrl(scopeName: GoogleScopeName, state: string): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', env.GOOGLE_CLIENT_ID ?? '');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_API_SCOPES[scopeName]);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

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
    const body = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google token refresh failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email?.toLowerCase() ?? null;
}
