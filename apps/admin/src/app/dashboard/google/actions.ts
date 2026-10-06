'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { googleConnections } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { disconnectScope, getConnectionForScope, getValidAccessToken } from '@/lib/google/connections';
import { isGoogleScopeName } from '@/lib/google/oauth';
import { syncBusinessProfile } from '@/lib/google/businessProfile';

export async function disconnectGoogleScope(scope: string) {
  const admin = await requireAdminAction('google.manage');
  if (!isGoogleScopeName(scope)) throw new Error('Unknown scope.');

  await disconnectScope(scope);
  await logAudit({ actorUserId: admin.id, action: 'google_connection.disconnected', targetType: 'google_connection', targetId: scope, metadata: { scope } });
  revalidatePath('/dashboard/google');
}

export async function syncGoogleBusinessProfile() {
  const admin = await requireAdminAction('google.manage');
  const connection = await getConnectionForScope('business_profile');
  if (!connection || connection.status !== 'connected') throw new Error('Business Profile is not connected.');

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) throw new Error('No usable access token for this connection — reconnect Business Profile.');

  try {
    await syncBusinessProfile(connection, accessToken);
    await db.update(googleConnections).set({ lastSyncedAt: new Date() }).where(eq(googleConnections.id, connection.id));
    await logAudit({ actorUserId: admin.id, action: 'google_connection.synced.business_profile', targetType: 'google_connection', targetId: connection.id });
  } catch (err) {
    await logAudit({ actorUserId: admin.id, action: 'google_connection.sync_failed.business_profile', targetType: 'google_connection', targetId: connection.id, metadata: { error: err instanceof Error ? err.message : 'unknown' } });
    throw err;
  }

  revalidatePath('/dashboard/google');
}
