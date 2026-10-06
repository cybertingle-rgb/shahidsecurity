import { datetime, json, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

/**
 * This application's own admin users — deliberately a separate table
 * from apps/learn's `users` (which holds LMS students/customers). Per
 * the brief: the LMS database stays completely separate from this
 * business CMS unless there is a compelling architectural reason, and
 * there isn't one here.
 */
export const adminUsers = mysqlTable(
  'admin_users',
  {
    id: idColumn(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    status: mysqlEnum('status', ['active', 'suspended']).notNull().default('active'),
    lastLoginAt: datetime('last_login_at'),
    createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('admin_users_email_idx').on(table.email)],
);

export const adminRoles = mysqlTable('admin_roles', {
  id: idColumn(),
  // Super Admin, Administrator, Editor, SEO Manager, Finance, Support —
  // per the brief's RBAC section. Stored as data, not a hardcoded enum,
  // so roles can be added without a migration.
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const adminPermissions = mysqlTable('admin_permissions', {
  id: idColumn(),
  key: varchar('key', { length: 150 }).notNull().unique(),
  description: text('description'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const adminRolePermissions = mysqlTable(
  'admin_role_permissions',
  {
    roleId: fkColumn('role_id')
      .notNull()
      .references(() => adminRoles.id, { onDelete: 'cascade' }),
    permissionId: fkColumn('permission_id')
      .notNull()
      .references(() => adminPermissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const adminUserRoles = mysqlTable(
  'admin_user_roles',
  {
    userId: fkColumn('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    roleId: fkColumn('role_id')
      .notNull()
      .references(() => adminRoles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const adminSessions = mysqlTable('admin_sessions', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => adminUsers.id, { onDelete: 'cascade' }),
  // Only a SHA-256 hash of the opaque session token is stored — a
  // database read alone can never be replayed as a valid cookie.
  sessionTokenHash: text('session_token_hash').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const adminAuthEvents = mysqlTable('admin_auth_events', {
  id: idColumn(),
  userId: fkColumn('user_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  eventType: mysqlEnum('event_type', ['login_success', 'login_failed', 'logout', 'password_changed']).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const rateLimitHits = mysqlTable('rate_limit_hits', {
  id: idColumn(),
  bucketKey: text('bucket_key').notNull(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Insert-only audit trail for every sensitive admin action — content
 * published, lead status changed, payment recorded, Google account
 * connected/disconnected, role changed, etc. Never logs passwords, OAuth
 * tokens, payment card data, or client secrets (enforced by convention in
 * every call site — see docs/ADMIN_SECURITY.md once written — and at the
 * database level by apply-grants.ts withholding UPDATE/DELETE/DROP on
 * this table specifically, same as apps/learn's audit_logs).
 */
export const auditLogs = mysqlTable('audit_logs', {
  id: idColumn(),
  actorUserId: fkColumn('actor_user_id'),
  action: varchar('action', { length: 150 }).notNull(),
  targetType: varchar('target_type', { length: 100 }),
  targetId: text('target_id'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
