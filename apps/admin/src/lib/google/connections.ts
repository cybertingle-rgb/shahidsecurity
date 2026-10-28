import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleConnections, googleSyncLogs, type GoogleConnection } from '@/db/schema';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { refreshGoogleAccessToken, type GoogleScopeName } from './oauth';

export async function getConnectionForScope(scope: GoogleScopeName): Promise<GoogleConnection | null> {
  const rows = await db.select().from(googleConnections).where(eq(googleConnections.scope, scope)).limit(1);
  return rows[0] ?? null;
}

export async function listAllConnections(): Promise<GoogleConnection[]> {
  return db.select().from(googleConnections);
}

export async function upsertConnection(
  scope: GoogleScopeName,
  data: { googleAccountEmail: string | null; accessToken: string; refreshToken: string | null; expiresInSeconds: number; grantedScopes: string },
): Promise<void> {
  const existing = await getConnectionForScope(scope);
  const tokenExpiresAt = new Date(Date.now() + data.expiresInSeconds * 1000);

  const values = {
    googleAccountEmail: data.googleAccountEmail,
    accessTokenEnc: encryptSecret(data.accessToken),
    // Google only returns a refresh_token on the first consent for a
    // given account; keep the existing one if this exchange didn't
    // return a new one, rather than overwriting it with null.
    refreshTokenEnc: data.refreshToken ? encryptSecret(data.refreshToken) : existing?.refreshTokenEnc ?? null,
    tokenExpiresAt,
    grantedScopes: data.grantedScopes,
    status: 'connected' as const,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(googleConnections).set(values).where(eq(googleConnections.id, existing.id));
  } else {
    await db.insert(googleConnections).values({ id: crypto.randomUUID(), scope, ...values });
  }
}

/**
 * Disconnects by actually clearing the stored token ciphertext, not
 * just flipping a status flag — a "disconnected" row must contain
 * nothing a bug or a database dump could ever replay as a valid
 * credential.
 */
export async function disconnectScope(scope: GoogleScopeName): Promise<void> {
  const existing = await getConnectionForScope(scope);
  if (!existing) return;
  await db
    .update(googleConnections)
    .set({
      status: 'disconnected',
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(googleConnections.id, existing.id));
}

/** Decrypts and returns a connection's access token — server-side use only; never return this to the client. */
export function decryptAccessToken(connection: GoogleConnection): string | null {
  if (!connection.accessTokenEnc) return null;
  return decryptSecret(connection.accessTokenEnc);
}

/**
 * Returns an access token guaranteed usable right now — refreshing and
 * persisting a new one first if the stored one is expired or expiring
 * within the next minute. Every Google API call this app makes beyond
 * the moment of initial OAuth consent should go through this, not
 * decryptAccessToken directly, since an access token is only valid for
 * about an hour.
 */
export async function getValidAccessToken(connection: GoogleConnection): Promise<string | null> {
  const refreshToken = decryptRefreshToken(connection);
  const expiringSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() < Date.now() + 60_000;

  if (!expiringSoon) {
    return decryptAccessToken(connection);
  }
  if (!refreshToken) {
    // No refresh token to renew with — fall back to whatever access
    // token is stored (it may still work, or the caller's API request
    // will fail with a clear 401 rather than this function guessing).
    return decryptAccessToken(connection);
  }

  const refreshed = await refreshGoogleAccessToken(refreshToken);
  await db
    .update(googleConnections)
    .set({
      accessTokenEnc: encryptSecret(refreshed.access_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      updatedAt: new Date(),
    })
    .where(eq(googleConnections.id, connection.id));

  return refreshed.access_token;
}

export function decryptRefreshToken(connection: GoogleConnection): string | null {
  if (!connection.refreshTokenEnc) return null;
  return decryptSecret(connection.refreshTokenEnc);
}

/** Records a failed sync/selection attempt for a connection — never logs the token itself, only the real error message. */
export async function logSyncError(connectionId: string, syncType: string, errorMessage: string): Promise<void> {
  await db.insert(googleSyncLogs).values({ id: crypto.randomUUID(), connectionId, syncType, status: 'error', errorMessage });
}

/**
 * Records a *successful* live read against a Google API — not just a
 * selection save. `google_connections.lastSyncedAt` was previously only
 * ever updated by the Business Profile "Sync now" button; Analytics and
 * Search Console had no equivalent, so their "last synced" state was
 * indistinguishable from "never connected" even when the dashboard was
 * actively rendering real data every page load. Call this once a report
 * panel's live query actually succeeds. Deliberately does nothing on
 * failure — a failed request must never advance or fabricate a sync
 * timestamp (see getLatestError/logSyncError for the failure side).
 */
export async function recordSuccessfulSync(connectionId: string, syncType: string): Promise<void> {
  await db.update(googleConnections).set({ lastSyncedAt: new Date() }).where(eq(googleConnections.id, connectionId));
  await db.insert(googleSyncLogs).values({ id: crypto.randomUUID(), connectionId, syncType, status: 'success' });
}

export type GoogleApiErrorKind = 'expired_token' | 'permission_denied' | 'quota_exceeded' | 'not_found' | 'unknown';

export type ClassifiedGoogleApiError = {
  kind: GoogleApiErrorKind;
  /** A short, admin-facing explanation — never the raw Google error body (which can be verbose/technical and is already preserved in full via logSyncError for audit purposes). */
  message: string;
};

/**
 * Every `lib/google/*.ts` function in this codebase throws a plain Error
 * whose message embeds the real HTTP status Google returned (e.g.
 * "Failed to list Google Business accounts: 401 {...}" — see
 * businessProfile.ts/analytics.ts/searchConsole.ts). Pages were
 * rendering that raw string directly, which works but gives an admin no
 * way to tell "your login expired, reconnect" (401) apart from "this
 * Google account genuinely isn't allowed to see this property" (403)
 * apart from "Google is rate-limiting us, try again shortly" (429) —
 * three very different required actions collapsed into one undifferentiated
 * error string. This never re-derives information Google didn't already
 * send; it only classifies the status code already embedded in the
 * thrown message into an actionable category.
 */
export function classifyGoogleApiError(err: unknown): ClassifiedGoogleApiError {
  const raw = err instanceof Error ? err.message : String(err);
  const statusMatch = raw.match(/\b(\d{3})\b/);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (status === 401) {
    return { kind: 'expired_token', message: 'Authorization has expired or was revoked. Reconnect this integration from the Google integrations page.' };
  }
  if (status === 403) {
    return { kind: 'permission_denied', message: 'The connected Google account does not have permission to access this property/account. Confirm access in Google, or connect a different Google account.' };
  }
  if (status === 429) {
    return { kind: 'quota_exceeded', message: 'Google API quota was exceeded for this request. This is usually temporary — try again in a few minutes.' };
  }
  if (status === 404) {
    return { kind: 'not_found', message: 'The selected property/account/location could not be found. It may have been removed or renamed in Google — reselect it.' };
  }
  return { kind: 'unknown', message: raw };
}

/** The most recent error logged for this connection, across every sync/selection type — shown in the Connections Center as "Last error". */
export async function getLatestError(connectionId: string): Promise<{ syncType: string; errorMessage: string | null; createdAt: Date } | null> {
  const rows = await db
    .select({ syncType: googleSyncLogs.syncType, errorMessage: googleSyncLogs.errorMessage, createdAt: googleSyncLogs.createdAt, status: googleSyncLogs.status })
    .from(googleSyncLogs)
    .where(eq(googleSyncLogs.connectionId, connectionId))
    .orderBy(desc(googleSyncLogs.createdAt))
    .limit(1);
  const [latest] = rows;
  if (!latest || latest.status !== 'error') return null;
  return latest;
}
