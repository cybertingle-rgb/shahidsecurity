'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getConnectionForScope, getValidAccessToken, logSyncError } from '@/lib/google/connections';
import { listLocationsForAccount, testBusinessProfileAccess, saveBusinessProfileSelection } from '@/lib/google/businessProfile';

/**
 * Saves an account+location selection only after both: (a) the location
 * is actually in that account's real accessible-locations list (never
 * trusts the submitted value blindly), and (b) a real read against it
 * succeeds. Per Phase 18M: never assume the first location is correct —
 * this always requires an explicit account id and location id from the
 * admin's own selection.
 */
export async function selectBusinessLocation(formData: FormData) {
  const admin = await requireAdminAction('google.manage');
  const accountId = String(formData.get('accountId') ?? '').trim();
  const locationId = String(formData.get('locationId') ?? '').trim();
  if (!accountId || !locationId) throw new Error('An account and location must both be selected.');

  const connection = await getConnectionForScope('business_profile');
  if (!connection || connection.status !== 'connected') throw new Error('Business Profile is not connected.');

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) throw new Error('No usable access token for this connection — reconnect Business Profile.');

  try {
    const locations = await listLocationsForAccount(accessToken, accountId);
    const match = locations.find((l) => l.locationId === locationId);
    if (!match) throw new Error('That location is not in this account\'s accessible locations list.');

    await testBusinessProfileAccess(accessToken, locationId);
    await saveBusinessProfileSelection(connection.id, { accountId, locationId: match.locationId, locationName: match.title });

    await logAudit({
      actorUserId: admin.id,
      action: 'GOOGLE_LOCATION_CHANGED',
      targetType: 'google_connection',
      targetId: connection.id,
      metadata: { scope: 'business_profile', accountId, locationId: match.locationId },
    });
  } catch (err) {
    await logSyncError(connection.id, 'business_profile_selection', err instanceof Error ? err.message : 'Unknown error.');
    throw err;
  }

  revalidatePath('/dashboard/google/business-profile');
  revalidatePath('/dashboard/google');
}
