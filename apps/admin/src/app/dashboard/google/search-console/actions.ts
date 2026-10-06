'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getConnectionForScope, getValidAccessToken } from '@/lib/google/connections';
import { listAccessibleSites, testSearchConsoleAccess, saveSearchConsoleSelection } from '@/lib/google/searchConsole';

/**
 * Saves a Search Console site selection only after both: (a) it's
 * actually in the authenticated account's real accessible-sites list
 * (never trusts the submitted value blindly — defends against a
 * tampered form field naming a site this account doesn't own), and
 * (b) a real Search Analytics query against it succeeds. Per Phase 18J:
 * select, then test, then mark connected — never the reverse.
 */
export async function selectSearchConsoleSite(formData: FormData) {
  const admin = await requireAdminAction('google.manage');
  const siteUrl = String(formData.get('siteUrl') ?? '').trim();
  if (!siteUrl) throw new Error('No site selected.');

  const connection = await getConnectionForScope('search_console');
  if (!connection || connection.status !== 'connected') throw new Error('Search Console is not connected.');

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) throw new Error('No usable access token for this connection — reconnect Search Console.');

  const sites = await listAccessibleSites(accessToken);
  const match = sites.find((s) => s.siteUrl === siteUrl);
  if (!match) throw new Error('That site is not in this Google account\'s accessible sites list.');

  await testSearchConsoleAccess(accessToken, siteUrl);
  await saveSearchConsoleSelection(connection.id, match.siteUrl, match.permissionLevel);

  await logAudit({
    actorUserId: admin.id,
    action: 'GOOGLE_PROPERTY_CHANGED',
    targetType: 'google_connection',
    targetId: connection.id,
    metadata: { scope: 'search_console', siteUrl: match.siteUrl },
  });

  revalidatePath('/dashboard/google/search-console');
}
