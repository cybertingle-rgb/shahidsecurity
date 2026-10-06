import { datetime, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { fkColumn, idColumn } from './columns';

/**
 * Per-page SEO metadata overrides, keyed by the real public path on
 * shahidiqbal.com (e.g. '/services/penetration-testing/'). A row here
 * only overrides title/description/canonical for that path; it does not
 * create pages, so it can never be used to spin up thin/fabricated
 * content under the guise of an "SEO page".
 */
export const seoPages = mysqlTable('seo_pages', {
  id: idColumn(),
  path: varchar('path', { length: 500 }).notNull().unique(),
  title: text('title'),
  description: text('description'),
  canonicalUrl: text('canonical_url'),
  robotsDirective: varchar('robots_directive', { length: 100 }),
  updatedByUserId: fkColumn('updated_by_user_id'),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const seoRedirects = mysqlTable('seo_redirects', {
  id: idColumn(),
  fromPath: varchar('from_path', { length: 500 }).notNull().unique(),
  toUrl: text('to_url').notNull(),
  statusCode: mysqlEnum('status_code', ['301', '302']).notNull().default('301'),
  createdByUserId: fkColumn('created_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export type SeoPage = typeof seoPages.$inferSelect;
