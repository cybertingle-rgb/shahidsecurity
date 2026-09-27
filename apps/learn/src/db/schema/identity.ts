import { datetime, json, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

export const users = mysqlTable(
  'users',
  {
    id: idColumn(),
    // varchar, not text: MySQL can't put a unique index on a TEXT column
    // without an explicit key-length prefix, so any column that needs a
    // unique/lookup index uses varchar with an explicit length instead.
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    fullName: text('full_name').notNull(),
    countryCode: text('country_code'),
    phone: text('phone'),
    username: varchar('username', { length: 100 }),
    emailVerifiedAt: datetime('email_verified_at'),
    status: mysqlEnum('status', ['active', 'suspended']).notNull().default('active'),
    lastLoginAt: datetime('last_login_at'),
    createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    // Case-insensitivity is enforced entirely at the application layer —
    // every read/write lowercases the email first (see the auth routes) —
    // so a plain unique index on the stored (always-lowercase) value is
    // sufficient.
    uniqueIndex('users_email_idx').on(table.email),
    uniqueIndex('users_username_idx').on(table.username),
  ],
);

export const roles = mysqlTable('roles', {
  id: idColumn(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const permissions = mysqlTable('permissions', {
  id: idColumn(),
  key: varchar('key', { length: 150 }).notNull().unique(),
  description: text('description'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    roleId: fkColumn('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: fkColumn('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: fkColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: fkColumn('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const sessions = mysqlTable('sessions', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Only a SHA-256 hash of the opaque session token is stored, so a
  // database read/leak alone can never be replayed as a valid cookie.
  sessionTokenHash: text('session_token_hash').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: datetime('expires_at').notNull(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const authEvents = mysqlTable('auth_events', {
  id: idColumn(),
  userId: fkColumn('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: mysqlEnum('event_type', [
    'login_success',
    'login_failed',
    'logout',
    'register',
    'email_verified',
    'password_reset_requested',
    'password_reset_completed',
    'suspicious_login',
  ]).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: json('metadata').$type<Record<string, unknown>>(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const emailVerificationTokens = mysqlTable('email_verification_tokens', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: datetime('expires_at').notNull(),
  usedAt: datetime('used_at'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const rateLimitHits = mysqlTable('rate_limit_hits', {
  id: idColumn(),
  bucketKey: text('bucket_key').notNull(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
