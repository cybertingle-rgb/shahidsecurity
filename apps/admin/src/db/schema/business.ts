import { boolean, datetime, int, json, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

/**
 * Single source of truth for business-identity facts (name, address,
 * phone, hours, etc.) that currently live hardcoded/duplicated across
 * the Astro site's JSON-LD and page content. A single row table by
 * convention (id is always fixed at seed time) rather than a key-value
 * table, since the shape is known and fixed, not arbitrary.
 */
export const businessSettings = mysqlTable('business_settings', {
  id: idColumn(),
  legalName: text('legal_name'),
  displayName: text('display_name'),
  description: text('description'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  region: text('region'),
  postalCode: varchar('postal_code', { length: 20 }),
  countryCode: varchar('country_code', { length: 2 }),
  latitude: text('latitude'),
  longitude: text('longitude'),
  openingHours: json('opening_hours').$type<Record<string, string>>(),
  logoMediaId: fkColumn('logo_media_id'),
  updatedByUserId: fkColumn('updated_by_user_id'),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const socialProfiles = mysqlTable('social_profiles', {
  id: idColumn(),
  platform: varchar('platform', { length: 50 }).notNull(),
  url: text('url').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const services = mysqlTable('services', {
  id: idColumn(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  name: text('name').notNull(),
  shortDescription: text('short_description'),
  bodyMarkdown: text('body_markdown'),
  sortOrder: int('sort_order').notNull().default(0),
  status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdByUserId: fkColumn('created_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const faqs = mysqlTable('faqs', {
  id: idColumn(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  // Optional association to a specific service's FAQ section; null means
  // it's a general/site-wide FAQ entry.
  serviceId: fkColumn('service_id'),
  sortOrder: int('sort_order').notNull().default(0),
  status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

/**
 * Case studies describing real, verifiable engagements only. Per the
 * standing no-fabrication rule, every row this table ever receives must
 * correspond to a real client engagement with the client's genuine
 * permission to publish — never a synthetic/illustrative example
 * presented as real.
 */
export const caseStudies = mysqlTable('case_studies', {
  id: idColumn(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary'),
  bodyMarkdown: text('body_markdown'),
  serviceId: fkColumn('service_id'),
  clientNameDisclosed: boolean('client_name_disclosed').notNull().default(false),
  status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
  createdByUserId: fkColumn('created_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export type BusinessSettings = typeof businessSettings.$inferSelect;
export type Service = typeof services.$inferSelect;
