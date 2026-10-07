import { datetime, json, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';

// Insert-only from application code: the app's normal database role has no
// UPDATE/DELETE/DROP grant on this table (MySQL's TRUNCATE requires the
// DROP privilege, so revoking DROP blocks TRUNCATE too — applied as part
// of the Phase 2 migration/role setup, not by application logic alone) —
// see docs/lms-database.md and docs/lms-security.md.
export const auditLogs = mysqlTable('audit_logs', {
  id: idColumn(),
  actorUserId: fkColumn('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  // No FK on purpose — polymorphic target, matching the original design.
  targetId: fkColumn('target_id'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const notifications = mysqlTable('notifications', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: json('payload').$type<Record<string, unknown>>(),
  readAt: datetime('read_at'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

// The generic admin-configurable settings store — how "no hardcoded PKR
// 800" and "no hardcoded community links" actually get satisfied at the
// code level: application code reads settings/products/communities
// tables, never a constant. See docs/lms-database.md.
export const settings = mysqlTable('settings', {
  id: idColumn(),
  key: varchar('key', { length: 150 }).notNull().unique(),
  value: json('value').$type<unknown>(),
});
