import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './identity';
import { instructors } from './courses';

export const productTypeEnum = pgEnum('product_type', [
  'course',
  'membership',
  'bundle',
  'workshop',
  'bootcamp',
  'mentoring',
  'digital_product',
  'live_class',
]);
export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'inactive']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded']);
export const paymentMethodEnum = pgEnum('payment_method', ['online', 'manual_bank_transfer']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending_verification', 'succeeded', 'failed', 'refunded']);
export const manualPaymentStatusEnum = pgEnum('manual_payment_status', ['pending', 'approved', 'rejected', 'clarification_requested']);
export const refundStatusEnum = pgEnum('refund_status', ['requested', 'approved', 'rejected', 'processed']);
export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', ['percentage', 'fixed']);

// "The Learn with Shahid Enrollment is just a row here, type `membership`"
// — docs/lms-database.md. This is the mechanism behind
// docs/LMS_DECISIONS.md #8: the PKR 800 price is never hardcoded in code.
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: productTypeEnum('type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: productStatusEnum('status').notNull().default('draft'),
  accessRules: jsonb('access_rules').$type<Record<string, unknown>>(),
  durationDays: integer('duration_days'),
  instructorId: uuid('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  seo: jsonb('seo').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const prices = pgTable(
  'prices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // ISO 4217 (PKR, USD, AED, SAR, QAR, ...)
    currencyCode: text('currency_code').notNull(),
    // ISO 3166-1 alpha-2, null = default price for that currency.
    countryCode: text('country_code'),
    // Minor units (paisa/cents) — never a float, per docs/lms-database.md.
    amount: integer('amount').notNull(),
    saleAmount: integer('sale_amount'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [uniqueIndex('prices_product_currency_country_idx').on(table.productId, table.currencyCode, table.countryCode)],
);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  amount: integer('amount').notNull(),
  currencyCode: text('currency_code').notNull(),
  discountAmount: integer('discount_amount').notNull().default(0),
  couponId: uuid('coupon_id'),
  paymentProvider: text('payment_provider'),
  paymentReference: text('payment_reference'),
  status: orderStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  unitAmount: integer('unit_amount').notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerPaymentId: text('provider_payment_id'),
  amount: integer('amount').notNull(),
  currencyCode: text('currency_code').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending_verification'),
  method: paymentMethodEnum('method').notNull(),
  verifiedByUserId: uuid('verified_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const manualPaymentSubmissions = pgTable('manual_payment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  transactionReference: text('transaction_reference').notNull(),
  amountClaimed: integer('amount_claimed').notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
  receiptFileUrl: text('receipt_file_url'),
  adminNotes: text('admin_notes'),
  status: manualPaymentStatusEnum('status').notNull().default('pending'),
});

export const refunds = pgTable('refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: text('reason'),
  status: refundStatusEnum('status').notNull().default('requested'),
  requestedByUserId: uuid('requested_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  processedByUserId: uuid('processed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

// V2 — schema exists per the Phase 2 "full schema now" decision; no coupon
// UI or checkout logic ships in V1 (docs/LMS_V1_SCOPE.md).
export const coupons = pgTable('coupons', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  discountType: couponDiscountTypeEnum('discount_type').notNull(),
  discountValue: integer('discount_value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  perUserLimit: integer('per_user_limit').default(1),
  applicableProductIds: uuid('applicable_product_ids').array(),
  minimumOrderAmount: integer('minimum_order_amount'),
  isActive: boolean('is_active').notNull().default(true),
});

export const couponUsage = pgTable(
  'coupon_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    usedAt: timestamp('used_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Closes the race-condition window on single-use coupons at the database
  // level, per docs/lms-payments.md's anti-fraud section.
  (table) => [uniqueIndex('coupon_usage_coupon_user_idx').on(table.couponId, table.userId)],
);
