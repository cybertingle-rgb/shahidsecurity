import { varchar } from 'drizzle-orm/mysql-core';

/**
 * MySQL has no native UUID type, so IDs are stored as varchar(36) and
 * generated client-side (Drizzle's $defaultFn runs in JS before the
 * INSERT, so this works identically across dialects — MySQL just doesn't
 * have a server-side gen_random_uuid() equivalent). Application code
 * should generate and pass the id explicitly on insert (crypto.randomUUID())
 * rather than relying on this default and a follow-up SELECT, since MySQL
 * has no RETURNING clause.
 */
export const idColumn = () =>
  varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const fkColumn = (name: string) => varchar(name, { length: 36 });
