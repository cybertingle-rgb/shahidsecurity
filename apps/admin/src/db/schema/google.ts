import { datetime, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

/**
 * Stores the server-side OAuth connection to a single Google account per
 * provider-scope combination. `accessTokenEnc`/`refreshTokenEnc` hold
 * AES-256-GCM-encrypted ciphertext (see src/lib/crypto.ts) — the
 * decrypted token value must never be returned to the admin UI, logged,
 * or included in an audit_logs row; the UI only ever renders
 * `googleAccountEmail` and `lastSyncedAt` (see docs/GOOGLE_INTEGRATION_SETUP.md
 * once written).
 */
export const googleConnections = mysqlTable('google_connections', {
  id: idColumn(),
  scope: mysqlEnum('scope', ['business_profile', 'analytics', 'search_console']).notNull(),
  googleAccountEmail: text('google_account_email'),
  accessTokenEnc: text('access_token_enc'),
  refreshTokenEnc: text('refresh_token_enc'),
  tokenExpiresAt: datetime('token_expires_at'),
  grantedScopes: text('granted_scopes'),
  connectedByUserId: fkColumn('connected_by_user_id'),
  status: mysqlEnum('status', ['connected', 'disconnected', 'error']).notNull().default('disconnected'),
  lastSyncedAt: datetime('last_synced_at'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Read-only cached mirror of the connected Google Business Profile's own
 * data (name, location, official review count/rating as Google reports
 * it) — never written to directly by this app in a way that fabricates
 * activity; this table only reflects what Google's API actually returned
 * on the last successful sync.
 */
export const googleBusinessProfiles = mysqlTable('google_business_profiles', {
  id: idColumn(),
  connectionId: fkColumn('connection_id').notNull(),
  googleLocationId: text('google_location_id'),
  locationName: text('location_name'),
  // Populated by src/lib/google/businessProfile.ts's sync once it calls
  // whichever Google API actually returns review stats (the Business
  // Information API's locations.get doesn't — this needs the Business
  // Profile Performance API or legacy My Business API v4's reviews
  // resource, not yet wired since it can't be verified against a real
  // response without live credentials). Columns exist now so a later
  // sync can fill them without a schema change; left null until then.
  averageRating: text('average_rating'),
  reviewCount: text('review_count'),
  lastFetchedAt: datetime('last_fetched_at'),
});

export const googleSyncLogs = mysqlTable('google_sync_logs', {
  id: idColumn(),
  connectionId: fkColumn('connection_id').notNull(),
  syncType: varchar('sync_type', { length: 100 }).notNull(),
  status: mysqlEnum('status', ['success', 'error']).notNull(),
  errorMessage: text('error_message'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const analyticsConnections = mysqlTable('analytics_connections', {
  id: idColumn(),
  connectionId: fkColumn('connection_id').notNull(),
  propertyId: text('property_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const searchConsoleConnections = mysqlTable('search_console_connections', {
  id: idColumn(),
  connectionId: fkColumn('connection_id').notNull(),
  siteUrl: text('site_url'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export type GoogleConnection = typeof googleConnections.$inferSelect;
