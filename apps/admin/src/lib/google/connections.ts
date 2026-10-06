import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleConnections, type GoogleConnection } from '@/db/schema';
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
