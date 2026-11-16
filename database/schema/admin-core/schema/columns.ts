import { customType, varchar } from 'drizzle-orm/mysql-core';

/**
 * MySQL has no native UUID type, so IDs are stored as varchar(36) and
 * generated client-side (Drizzle's $defaultFn runs in JS before the
 * INSERT) — same pattern as apps/learn/src/db/schema/columns.ts.
 */
export const idColumn = () =>
  varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const fkColumn = (name: string) => varchar(name, { length: 36 });

/**
 * MySQL LONGBLOB (up to 4GB) — drizzle-orm's mysql-core has no built-in
 * blob column, so this defines one via customType. Used to store
 * uploaded file bytes directly in the database (see src/lib/media.ts):
 * this host's deployed app directory is NOT persistent across deploys
 * (Hostinger's Git pipeline swaps in a brand-new versioned directory on
 * every deploy — confirmed via its hbuilds/versions/<uuid> layout), so
 * anything written to local disk at runtime (the previous approach)
 * silently vanishes the next time either app is redeployed. The MySQL
 * database is a separate, always-on service the deploy pipeline never
 * touches, so it's the only thing on this host actually safe to persist
 * runtime-uploaded bytes in.
 */
export const longblob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'longblob';
  },
});
