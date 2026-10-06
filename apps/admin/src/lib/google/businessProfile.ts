import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { googleBusinessProfiles, googleSyncLogs, type GoogleConnection } from '@/db/schema';

// Business Profile Performance/Information APIs — "accounts.locations"
// is nested under the Account Management API, so a real integration
// needs two calls: list the connected Google account's accounts, then
// list locations for whichever account the admin picks. See:
// https://developers.google.com/my-business/reference/accountmanagement/rest
// https://developers.google.com/my-business/reference/businessinformation/rest
const ACCOUNTS_ENDPOINT = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const BUSINESS_INFO_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

export type GoogleBusinessAccount = { accountId: string; accountName: string };
export type GoogleBusinessLocation = { locationId: string; title: string };

/** Lists every Business Profile account the authenticated Google account can access — never assumed, never hard-coded. */
export async function listAccounts(accessToken: string): Promise<GoogleBusinessAccount[]> {
  const res = await fetch(ACCOUNTS_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    throw new Error(`Failed to list Google Business accounts: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { accounts?: Array<{ name: string; accountName?: string }> };
  return (data.accounts ?? []).map((a) => ({ accountId: a.name, accountName: a.accountName ?? a.name }));
}

/** Lists every location under one specific account — the admin must explicitly pick one even if there's only one. */
export async function listLocationsForAccount(accessToken: string, accountId: string): Promise<GoogleBusinessLocation[]> {
  const res = await fetch(`${BUSINESS_INFO_BASE}/${accountId}/locations?readMask=name,title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to list locations: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json()) as { locations?: Array<{ name: string; title?: string }> };
  return (data.locations ?? []).map((l) => ({ locationId: l.name, title: l.title ?? l.name }));
}

/** A minimal real read used purely to confirm access before saving a location selection — throws if the account can't actually read it. */
export async function testBusinessProfileAccess(accessToken: string, locationId: string): Promise<void> {
  const res = await fetch(`${BUSINESS_INFO_BASE}/${locationId}?readMask=name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to verify access to this location: ${res.status} ${await res.text().catch(() => '')}`);
  }
}

/**
 * Saves the admin's explicit account/location choice — never the first
 * result of a list call. Phase 18M: "Do not assume the first location
 * is the correct one. Let the administrator explicitly select it."
 */
export async function saveBusinessProfileSelection(
  connectionId: string,
  selection: { accountId: string; locationId: string; locationName: string },
): Promise<void> {
  const [existing] = await db.select().from(googleBusinessProfiles).where(eq(googleBusinessProfiles.connectionId, connectionId)).limit(1);
  const values = {
    connectionId,
    googleAccountId: selection.accountId,
    googleLocationId: selection.locationId,
    locationName: selection.locationName,
    lastFetchedAt: new Date(),
  };
  if (existing) {
    await db.update(googleBusinessProfiles).set(values).where(eq(googleBusinessProfiles.id, existing.id));
  } else {
    await db.insert(googleBusinessProfiles).values({ id: crypto.randomUUID(), ...values });
  }
}

/**
 * Re-reads the already-selected location's current name from Google and
 * refreshes the cached row — never re-picks "the first" account or
 * location on its own; a selection must already exist (saved via
 * saveBusinessProfileSelection, from an explicit admin choice).
 */
export async function syncBusinessProfile(connection: GoogleConnection, accessToken: string): Promise<void> {
  const [existing] = await db.select().from(googleBusinessProfiles).where(eq(googleBusinessProfiles.connectionId, connection.id)).limit(1);
  if (!existing?.googleLocationId) {
    throw new Error('No location selected yet — select an account and location before syncing.');
  }

  const res = await fetch(`${BUSINESS_INFO_BASE}/${existing.googleLocationId}?readMask=name,title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to refresh location: ${res.status} ${await res.text().catch(() => '')}`);
  }
  const location = (await res.json()) as { title?: string };

  await db
    .update(googleBusinessProfiles)
    .set({ locationName: location.title ?? existing.locationName, lastFetchedAt: new Date() })
    .where(eq(googleBusinessProfiles.id, existing.id));

  await db.insert(googleSyncLogs).values({ id: crypto.randomUUID(), connectionId: connection.id, syncType: 'business_profile', status: 'success' });
}

export async function getCachedBusinessProfile(connectionId: string) {
  const rows = await db.select().from(googleBusinessProfiles).where(eq(googleBusinessProfiles.connectionId, connectionId)).limit(1);
  return rows[0] ?? null;
}
