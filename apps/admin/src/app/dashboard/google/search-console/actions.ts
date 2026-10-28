'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { getConnectionForScope, getValidAccessToken, logSyncError, recordSuccessfulSync } from '@/lib/google/connections';
import { listAccessibleSites, testSearchConsoleAccess, saveSearchConsoleSelection, getSearchConsoleSelection } from '@/lib/google/searchConsole';

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

  try {
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
  } catch (err) {
    await logSyncError(connection.id, 'search_console_selection', err instanceof Error ? err.message : 'Unknown error.');
    throw err;
  }

  revalidatePath('/dashboard/google/search-console');
}

/**
 * Safe verification action ("Test connection") — re-confirms the
 * *already-selected* property is still reachable with a real, minimal
 * Search Analytics query, without changing or re-prompting the
 * selection. Distinct from selectSearchConsoleSite, which picks a new
 * property; this only answers "is the current one still good right now."
 */
export async function verifySearchConsoleConnection() {
  const admin = await requireAdminAction('google.manage');
  const connection = await getConnectionForScope('search_console');
  if (!connection || connection.status !== 'connected') throw new Error('Search Console is not connected.');

  const selection = await getSearchConsoleSelection(connection.id);
  if (!selection?.siteUrl) throw new Error('No property selected yet — select one before verifying.');

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) throw new Error('No usable access token for this connection — reconnect Search Console.');

  try {
    await testSearchConsoleAccess(accessToken, selection.siteUrl);
    await recordSuccessfulSync(connection.id, 'search_console_verify');
    await logAudit({
      actorUserId: admin.id,
      action: 'GOOGLE_CONNECTION_VERIFIED',
      targetType: 'google_connection',
      targetId: connection.id,
      metadata: { scope: 'search_console', siteUrl: selection.siteUrl },
    });
  } catch (err) {
    await logSyncError(connection.id, 'search_console_verify', err instanceof Error ? err.message : 'Unknown error.');
    throw err;
  }

  revalidatePath('/dashboard/google/search-console');
}
