import { boolean, datetime, decimal, int, json, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

/**
 * Monthly cybersecurity support plans shown on the public /pricing page
 * (shahidiqbal.com) — the single source of truth for every USD price
 * quoted there (per docs/PRICING.md: "the price shown here always
 * comes from the same server-side value, never a hardcoded number" —
 * same discipline as apps/learn/docs/LMS_DECISIONS.md #8). `category`
 * distinguishes the "Security Assurance" monthly plans from the
 * separate "Managed Security Operations" (co-managed / MDR) tier, which
 * the public page renders as a visually distinct section per the brief.
 * monthlyPriceUsd is nullable deliberately: Enterprise-style plans are
 * "From $X" or fully custom-quoted, never a fixed number a visitor can
 * self-checkout against.
 */
export const pricingPlans = mysqlTable('pricing_plans', {
  id: idColumn(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: text('name').notNull(),
  targetAudience: text('target_audience'),
  category: mysqlEnum('category', ['assurance', 'managed_security']).notNull().default('assurance'),
  monthlyPriceUsd: decimal('monthly_price_usd', { precision: 10, scale: 2 }),
  // When monthlyPriceUsd is set but the true cost can run higher (e.g.
  // Enterprise's "From $7,500"), this renders "From" in front of the
  // price instead of implying it's a fixed, final number.
  isStartingAtPrice: boolean('is_starting_at_price').notNull().default(false),
  minContractMonths: int('min_contract_months').notNull().default(3),
  includedFeatures: json('included_features').$type<string[]>().notNull().default([]),
  includedAssetLimit: int('included_asset_limit'),
  includedAnalystHoursPerMonth: int('included_analyst_hours_per_month'),
  isRecommended: boolean('is_recommended').notNull().default(false),
  status: mysqlEnum('status', ['draft', 'active', 'disabled']).notNull().default('draft'),
  ctaLabel: text('cta_label'),
  // true = no self-serve "subscribe" path exists for this plan at all —
  // the only CTA is a proposal/inquiry request (Enterprise, and any
  // managed_security-category plan gated by SOC readiness below).
  requiresEnterpriseContact: boolean('requires_enterprise_contact').notNull().default(false),
  // Only meaningful for category='managed_security' rows (e.g. Managed
  // Detection & Response) — true means this plan must never be shown as
  // purchasable unless soc_readiness_settings.availability is 'active'.
  // See src/lib/pricing/socReadiness.ts.
  requires24x7Readiness: boolean('requires_24x7_readiness').notNull().default(false),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Specialist add-on services (penetration tests, assessments, etc.) —
 * separate from the recurring pricing_plans above since these are
 * one-off engagements, not monthly support tiers. startingPriceUsd null
 * means "Custom Quote" (e.g. digital forensics) rather than any number.
 */
export const addOnServices = mysqlTable('add_on_services', {
  id: idColumn(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  startingPriceUsd: decimal('starting_price_usd', { precision: 10, scale: 2 }),
  status: mysqlEnum('status', ['draft', 'active', 'disabled']).notNull().default('draft'),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Single-row settings table (see businessSettings in business.ts for
 * the established pattern this follows, and src/lib/pricing/consultationSettings.ts
 * for the getOrCreate helper). The owner explicitly chose a PAID
 * consultation model — this is the one place that fee lives, so
 * changing it in the admin dashboard changes it everywhere at once.
 * refundPolicyText is required to actually display a refund policy on
 * the public page — isRefundable alone is never enough, so a false
 * claim is never implied by an unset text field.
 */
export const consultationSettings = mysqlTable('consultation_settings', {
  id: idColumn(),
  feeUsd: decimal('fee_usd', { precision: 10, scale: 2 }).notNull().default('150.00'),
  durationMinutes: int('duration_minutes').notNull().default(45),
  isRefundable: boolean('is_refundable').notNull().default(false),
  refundPolicyText: text('refund_policy_text'),
  updatedByUserId: fkColumn('updated_by_user_id'),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Cached FX rates (units of `currencyCode` per 1 USD), auto-refreshed
 * by /api/internal/refresh-fx-rates (see that route's comment for the
 * provider and refresh policy) — deliberately separate from apps/learn's
 * exchange_rates table, which is a different, intentionally-manual
 * system for that app's own checkout pricing (see that table's own
 * comment: "Admin-set, never auto-updated from a live FX API —
 * deliberately"). This one backs the public pricing page's "approximate
 * local currency" display, which the brief explicitly requires to be
 * automatic, not hand-entered.
 */
export const fxRates = mysqlTable('fx_rates', {
  currencyCode: varchar('currency_code', { length: 3 }).primaryKey(),
  rateToUsd: decimal('rate_to_usd', { precision: 18, scale: 8 }).notNull(),
  fetchedAt: datetime('fetched_at').notNull(),
});

/**
 * Single-row settings table controlling whether 24/7 managed monitoring
 * (Managed Detection & Response) is ever shown as an actually-purchasable
 * service — see docs/SOC_READINESS.md. Defaults to 'disabled' and must
 * be moved out of that state deliberately by an authorized admin; never
 * auto-activated by code, a deploy, or a default value change.
 */
export const socReadinessSettings = mysqlTable('soc_readiness_settings', {
  id: idColumn(),
  availability: mysqlEnum('availability', ['disabled', 'inquiry_only', 'active']).notNull().default('disabled'),
  notes: text('notes'),
  updatedByUserId: fkColumn('updated_by_user_id'),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export type PricingPlan = typeof pricingPlans.$inferSelect;
export type AddOnService = typeof addOnServices.$inferSelect;
export type ConsultationSettings = typeof consultationSettings.$inferSelect;
export type FxRate = typeof fxRates.$inferSelect;
export type SocReadinessSettings = typeof socReadinessSettings.$inferSelect;
