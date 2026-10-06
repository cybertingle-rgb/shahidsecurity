import { varchar } from 'drizzle-orm/mysql-core';

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
