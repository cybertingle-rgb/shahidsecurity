'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getConnectionForScope, getValidAccessToken, logSyncError } from '@/lib/google/connections';
import { listAccessibleProperties, getPropertyDetails, testAnalyticsAccess, saveAnalyticsSelection } from '@/lib/google/analytics';

/**
 * Saves a GA4 property selection only after both: (a) it's actually in
 * the authenticated account's real accessible-properties list (never
 * trusts the submitted value blindly), and (b) a real report query
 * against it succeeds. Per Phase 18I: select, then test, then mark
 * connected — never the reverse, and never a hard-coded property id.
 */
export async function selectAnalyticsProperty(formData: FormData) {
  const admin = await requireAdminAction('google.manage');
  const propertyId = String(formData.get('propertyId') ?? '').trim();
  if (!propertyId) throw new Error('No property selected.');

  const connection = await getConnectionForScope('analytics');
  if (!connection || connection.status !== 'connected') throw new Error('Analytics is not connected.');

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) throw new Error('No usable access token for this connection — reconnect Analytics.');

  try {
    const properties = await listAccessibleProperties(accessToken);
    const match = properties.find((p) => p.propertyId === propertyId);
    if (!match) throw new Error('That property is not in this Google account\'s accessible properties list.');

    await testAnalyticsAccess(accessToken, propertyId);
    const details = await getPropertyDetails(accessToken, propertyId);
    await saveAnalyticsSelection(connection.id, {
      propertyId: match.propertyId,
      propertyName: match.propertyName,
      timezone: details.timezone,
      currency: details.currency,
    });

    await logAudit({
      actorUserId: admin.id,
      action: 'GOOGLE_PROPERTY_CHANGED',
      targetType: 'google_connection',
      targetId: connection.id,
      metadata: { scope: 'analytics', propertyId: match.propertyId },
    });
  } catch (err) {
    await logSyncError(connection.id, 'analytics_selection', err instanceof Error ? err.message : 'Unknown error.');
    throw err;
  }

  revalidatePath('/dashboard/google/analytics');
}
