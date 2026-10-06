import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleBusinessProfiles, googleSyncLogs, type GoogleConnection } from '@/db/schema';
import { decryptAccessToken } from './connections';

// Business Profile Performance/Information APIs — "accounts.locations"
// is nested under the Account Management API, so a real integration
// needs two calls: list the connected Google account's locations, then
// read Business Information for the first one. See:
// https://developers.google.com/my-business/reference/accountmanagement/rest
// https://developers.google.com/my-business/reference/businessinformation/rest
const ACCOUNTS_ENDPOINT = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';

type GoogleAccount = { name: string };
type GoogleLocation = { name: string; title?: string };

/**
 * Fetches the connected Google account's first Business Profile
 * location and caches its real, Google-reported identity fields —
 * never a review count or rating this app invents. If the account has
 * no locations, or the API call fails, this throws rather than writing
 * a fabricated fallback; the caller (the "Sync now" action) logs the
 * failure to google_sync_logs and leaves the cached row as it was.
 */
export async function syncBusinessProfile(connection: GoogleConnection): Promise<void> {
  const accessToken = decryptAccessToken(connection);
  if (!accessToken) throw new Error('No access token on this connection.');

  const accountsRes = await fetch(ACCOUNTS_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!accountsRes.ok) {
    throw new Error(`Failed to list Google Business accounts: ${accountsRes.status} ${await accountsRes.text().catch(() => '')}`);
  }
  const accountsData = (await accountsRes.json()) as { accounts?: GoogleAccount[] };
  const account = accountsData.accounts?.[0];
  if (!account) throw new Error('No Google Business Profile account found for this connection.');

  const locationsRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!locationsRes.ok) {
    throw new Error(`Failed to list locations: ${locationsRes.status} ${await locationsRes.text().catch(() => '')}`);
  }
  const locationsData = (await locationsRes.json()) as { locations?: GoogleLocation[] };
  const location = locationsData.locations?.[0];
  if (!location) throw new Error('This Google Business account has no locations.');

  const [existing] = await db.select().from(googleBusinessProfiles).where(eq(googleBusinessProfiles.connectionId, connection.id)).limit(1);
  const values = {
    connectionId: connection.id,
    googleLocationId: location.name,
    locationName: location.title ?? null,
    lastFetchedAt: new Date(),
  };
  if (existing) {
    await db.update(googleBusinessProfiles).set(values).where(eq(googleBusinessProfiles.id, existing.id));
  } else {
    await db.insert(googleBusinessProfiles).values({ id: crypto.randomUUID(), ...values });
  }

  await db.insert(googleSyncLogs).values({ id: crypto.randomUUID(), connectionId: connection.id, syncType: 'business_profile', status: 'success' });
}

export async function getCachedBusinessProfile(connectionId: string) {
  const rows = await db.select().from(googleBusinessProfiles).where(eq(googleBusinessProfiles.connectionId, connectionId)).limit(1);
  return rows[0] ?? null;
}
