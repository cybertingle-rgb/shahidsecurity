import Link from 'next/link';
import { getConnectionForScope, getValidAccessToken } from '@/lib/google/connections';
import {
  listAccounts,
  listLocationsForAccount,
  getCachedBusinessProfile,
  type GoogleBusinessAccount,
  type GoogleBusinessLocation,
} from '@/lib/google/businessProfile';
import { selectBusinessLocation } from './actions';
import { syncGoogleBusinessProfile } from '../actions';

export default async function BusinessProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ change?: string; accountId?: string; error?: string }>;
}) {
  const { change, accountId, error } = await searchParams;
  const connection = await getConnectionForScope('business_profile');

  if (!connection || connection.status !== 'connected') {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Business Profile</h1>
        <p className="text-sm text-text-muted">
          Not connected yet. <Link href="/dashboard/google" className="text-neon underline">Connect Google Business Profile</Link> first.
        </p>
      </div>
    );
  }

  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold">Business Profile</h1>
        <p className="text-sm text-danger">No usable access token for this connection. Reconnect from the Google integrations page.</p>
      </div>
    );
  }

  const selection = await getCachedBusinessProfile(connection.id);
  const showPicker = change === '1' || !selection?.googleLocationId;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Business Profile</h1>
      {error && <p className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p>}

      {!showPicker && selection ? (
        <div className="rounded-lg border border-border bg-bg-elevated/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Selected location: <span className="font-medium">{selection.locationName ?? selection.googleLocationId}</span>
            </p>
            <div className="flex gap-2">
              <form action={syncGoogleBusinessProfile}>
                <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                  Sync now
                </button>
              </form>
              <Link href="/dashboard/google/business-profile?change=1" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                Change location
              </Link>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Last synced: {selection.lastFetchedAt ? selection.lastFetchedAt.toLocaleString() : 'never'}.
          </p>
          <p className="mt-2 text-xs text-text-muted">
            Rating/review count: not available from the currently-supported Business Information API — see{' '}
            <code>docs/GOOGLE_BUSINESS_PROFILE.md</code>. Managed directly in{' '}
            <a href="https://business.google.com" target="_blank" rel="noreferrer" className="text-neon underline">
              Google Business Profile
            </a>
            .
          </p>
        </div>
      ) : accountId ? (
        <LocationPicker accessToken={accessToken} accountId={accountId} />
      ) : (
        <AccountPicker accessToken={accessToken} />
      )}
    </div>
  );
}

async function AccountPicker({ accessToken }: { accessToken: string }) {
  let accounts: GoogleBusinessAccount[] = [];
  let listError: string | null = null;
  try {
    accounts = await listAccounts(accessToken);
  } catch (err) {
    listError = err instanceof Error ? err.message : 'Failed to list accessible accounts.';
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
      <p className="text-sm text-text-muted">Select which Google Business account to read from.</p>
      {listError && <p className="text-sm text-danger">{listError}</p>}
      {!listError && accounts.length === 0 && <p className="text-sm text-warn">No accessible Business accounts found for this Google account.</p>}
      <ul className="space-y-2">
        {accounts.map((account) => (
          <li key={account.accountId}>
            <Link
              href={`/dashboard/google/business-profile?change=1&accountId=${encodeURIComponent(account.accountId)}`}
              className="block rounded-md border border-border px-3 py-2 text-sm hover:border-neon"
            >
              {account.accountName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function LocationPicker({ accessToken, accountId }: { accessToken: string; accountId: string }) {
  let locations: GoogleBusinessLocation[] = [];
  let listError: string | null = null;
  try {
    locations = await listLocationsForAccount(accessToken, accountId);
  } catch (err) {
    listError = err instanceof Error ? err.message : 'Failed to list locations for this account.';
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">Select which location under this account SHAHID SECURITY uses.</p>
        <Link href="/dashboard/google/business-profile?change=1" className="text-xs text-text-muted underline">
          Back to accounts
        </Link>
      </div>
      {listError && <p className="text-sm text-danger">{listError}</p>}
      {!listError && locations.length === 0 && <p className="text-sm text-warn">This account has no locations.</p>}
      {locations.length > 0 && (
        <form action={selectBusinessLocation} className="space-y-3">
          <input type="hidden" name="accountId" value={accountId} />
          <div className="space-y-2">
            {locations.map((location) => (
              <label key={location.locationId} className="flex items-center gap-2 text-sm">
                <input type="radio" name="locationId" value={location.locationId} required />
                <span>{location.title}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Test &amp; save selection
          </button>
        </form>
      )}
    </div>
  );
}
