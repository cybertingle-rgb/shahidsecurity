import { boolean, datetime, int, json, mysqlEnum, mysqlTable, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';
import { instructors } from './courses';

// "The Learn with Shahid Enrollment is just a row here, type `membership`"
// — docs/lms-database.md. This is the mechanism behind
// docs/LMS_DECISIONS.md #8: the PKR 800 price is never hardcoded in code.
export const products = mysqlTable('products', {
  id: idColumn(),
  type: mysqlEnum('type', [
    'course',
    'membership',
    'bundle',
    'workshop',
    'bootcamp',
    'mentoring',
    'digital_product',
    'live_class',
  ]).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['draft', 'active', 'inactive']).notNull().default('draft'),
  accessRules: json('access_rules').$type<Record<string, unknown>>(),
  durationDays: int('duration_days'),
  instructorId: fkColumn('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  seo: json('seo').$type<Record<string, unknown>>(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const prices = mysqlTable(
  'prices',
  {
    id: idColumn(),
    productId: fkColumn('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // ISO 4217 (PKR, USD, AED, SAR, QAR, ...)
    currencyCode: varchar('currency_code', { length: 3 }).notNull(),
    // ISO 3166-1 alpha-2, null = default price for that currency. MySQL
    // treats NULL as distinct in a unique index the same way Postgres
    // does, so multiple currencies can each have one NULL-country default row.
    countryCode: varchar('country_code', { length: 2 }),
    // Minor units (paisa/cents) — never a float, per docs/lms-database.md.
    amount: int('amount').notNull(),
    saleAmount: int('sale_amount'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('prices_product_currency_country_idx').on(table.productId, table.currencyCode, table.countryCode)],
);

export const orders = mysqlTable('orders', {
  id: idColumn(),
  orderNumber: varchar('order_number', { length: 64 }).notNull().unique(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  productId: fkColumn('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  amount: int('amount').notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  discountAmount: int('discount_amount').notNull().default(0),
  // No FK here on purpose (matches the original design): a coupon can be
  // deactivated/removed without touching historical order rows.
  couponId: fkColumn('coupon_id'),
  paymentProvider: text('payment_provider'),
  paymentReference: text('payment_reference'),
  status: mysqlEnum('status', ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded']).notNull().default('pending'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  paidAt: datetime('paid_at'),
});

export const orderItems = mysqlTable('order_items', {
  id: idColumn(),
  orderId: fkColumn('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: fkColumn('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  unitAmount: int('unit_amount').notNull(),
});

export const payments = mysqlTable('payments', {
  id: idColumn(),
  orderId: fkColumn('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  amount: int('amount').notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  status: mysqlEnum('status', ['pending_verification', 'succeeded', 'failed', 'refunded']).notNull().default('pending_verification'),
  method: mysqlEnum('method', ['online', 'manual_bank_transfer']).notNull(),
  verifiedByUserId: fkColumn('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: datetime('verified_at'),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const manualPaymentSubmissions = mysqlTable('manual_payment_submissions', {
  id: idColumn(),
  paymentId: fkColumn('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  transactionReference: text('transaction_reference').notNull(),
  amountClaimed: int('amount_claimed').notNull(),
  paymentDate: datetime('payment_date').notNull(),
  receiptFileUrl: text('receipt_file_url'),
  adminNotes: text('admin_notes'),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'clarification_requested']).notNull().default('pending'),
});

export const refunds = mysqlTable('refunds', {
  id: idColumn(),
  paymentId: fkColumn('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  amount: int('amount').notNull(),
  reason: text('reason'),
  status: mysqlEnum('status', ['requested', 'approved', 'rejected', 'processed']).notNull().default('requested'),
  requestedByUserId: fkColumn('requested_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  processedByUserId: fkColumn('processed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  processedAt: datetime('processed_at'),
});

// V2 — schema exists per the Phase 2 "full schema now" decision; no coupon
// UI or checkout logic ships in V1 (docs/LMS_V1_SCOPE.md).
export const coupons = mysqlTable('coupons', {
  id: idColumn(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  discountType: mysqlEnum('discount_type', ['percentage', 'fixed']).notNull(),
  discountValue: int('discount_value').notNull(),
  expiresAt: datetime('expires_at'),
  usageLimit: int('usage_limit'),
  perUserLimit: int('per_user_limit').default(1),
  // No native array type in MySQL — stored as a JSON array of product ids
  // instead of Postgres's uuid[]. Empty array (not null) means "all products".
  applicableProductIds: json('applicable_product_ids').$type<string[]>(),
  minimumOrderAmount: int('minimum_order_amount'),
  isActive: boolean('is_active').notNull().default(true),
});

export const couponUsage = mysqlTable(
  'coupon_usage',
  {
    id: idColumn(),
    couponId: fkColumn('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: fkColumn('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: fkColumn('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    usedAt: datetime('used_at').notNull().$defaultFn(() => new Date()),
  },
  // Closes the race-condition window on single-use coupons at the database
  // level, per docs/lms-payments.md's anti-fraud section.
  (table) => [uniqueIndex('coupon_usage_coupon_user_idx').on(table.couponId, table.userId)],
);
