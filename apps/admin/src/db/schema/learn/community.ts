import { datetime, int, mysqlEnum, mysqlTable, text } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';
import { products } from './commerce';

export const memberships = mysqlTable('memberships', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: fkColumn('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  status: mysqlEnum('status', ['active', 'expired', 'cancelled']).notNull().default('active'),
  startedAt: datetime('started_at').notNull().$defaultFn(() => new Date()),
  expiresAt: datetime('expires_at'),
});

// communities.url is never returned by any public/unauthenticated API
// response — see docs/lms-security.md and LMS_DECISIONS.md #10.
export const communities = mysqlTable('communities', {
  id: idColumn(),
  name: text('name').notNull(),
  description: text('description'),
  platform: mysqlEnum('platform', ['discord', 'facebook', 'telegram', 'whatsapp', 'other']).notNull(),
  url: text('url').notNull(),
  requiredProductId: fkColumn('required_product_id').references(() => products.id, { onDelete: 'set null' }),
  status: mysqlEnum('status', ['active', 'inactive']).notNull().default('active'),
  sortOrder: int('sort_order').notNull().default(0),
});

export const communityAccess = mysqlTable('community_access', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  communityId: fkColumn('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['not_eligible', 'eligible', 'invitation_pending', 'invited', 'joined', 'revoked']).notNull().default('not_eligible'),
  invitedAt: datetime('invited_at'),
  joinedAt: datetime('joined_at'),
  notes: text('notes'),
});
