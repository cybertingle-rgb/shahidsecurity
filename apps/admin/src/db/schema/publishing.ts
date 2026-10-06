import { datetime, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

/**
 * Tracks every attempt to publish admin content to the live, statically-
 * built public site via a real git commit — see
 * docs/ADMIN_PUBLIC_SITE_INTEGRATION.md for why a commit, not a runtime
 * database read, is how this site gets content. One row per publish
 * attempt (not per content item), so retrying a failed publish creates
 * a new row rather than overwriting the failure record.
 */
export const publications = mysqlTable('publications', {
  id: idColumn(),
  contentType: mysqlEnum('content_type', ['blog_post', 'seo_page']).notNull(),
  // The blog_posts.id or seo_pages.id this publish attempt is for.
  contentId: fkColumn('content_id').notNull(),
  // Human-readable target for the status UI — the post's slug, or the
  // SEO override's path.
  targetSlugOrPath: varchar('target_slug_or_path', { length: 500 }).notNull(),
  status: mysqlEnum('status', ['publishing', 'building', 'deploying', 'published', 'failed']).notNull().default('publishing'),
  // The real git commit SHA this publish created, once committed —
  // this is the "Published commit" shown in the admin UI, and what a
  // rollback reverts.
  commitSha: varchar('commit_sha', { length: 40 }),
  // The commit this publish is replacing, if any — what a rollback for
  // this publication would restore.
  previousCommitSha: varchar('previous_commit_sha', { length: 40 }),
  // The GitHub Actions workflow run id for that commit, once known —
  // used to poll real build/deploy status rather than guessing.
  workflowRunId: varchar('workflow_run_id', { length: 50 }),
  errorMessage: text('error_message'),
  publishedByUserId: fkColumn('published_by_user_id').notNull(),
  // Millisecond precision — the dashboard's "most recent publish across
  // every content item" query orders by this, and plain-second DATETIME
  // can tie when a publish and its immediate rollback land in the same
  // second.
  createdAt: datetime('created_at', { fsp: 3 }).notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at', { fsp: 3 }).notNull().$defaultFn(() => new Date()),
});

export type Publication = typeof publications.$inferSelect;
