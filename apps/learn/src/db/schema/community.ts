import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';
import { products } from './commerce';

export const membershipStatusEnum = pgEnum('membership_status', ['active', 'expired', 'cancelled']);
export const communityPlatformEnum = pgEnum('community_platform', ['discord', 'facebook', 'telegram', 'whatsapp', 'other']);
export const communityStatusEnum = pgEnum('community_status', ['active', 'inactive']);
export const communityAccessStatusEnum = pgEnum('community_access_status', [
  'not_eligible',
  'eligible',
  'invitation_pending',
  'invited',
  'joined',
  'revoked',
]);

export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  status: membershipStatusEnum('status').notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

// communities.url is never returned by any public/unauthenticated API
// response — see docs/lms-security.md and LMS_DECISIONS.md #10.
export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  platform: communityPlatformEnum('platform').notNull(),
  url: text('url').notNull(),
  requiredProductId: uuid('required_product_id').references(() => products.id, { onDelete: 'set null' }),
  status: communityStatusEnum('status').notNull().default('active'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const communityAccess = pgTable('community_access', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  communityId: uuid('community_id')
    .notNull()
    .references(() => communities.id, { onDelete: 'cascade' }),
  status: communityAccessStatusEnum('status').notNull().default('not_eligible'),
  invitedAt: timestamp('invited_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  notes: text('notes'),
});
