import { datetime, int, json, mysqlEnum, mysqlTable, primaryKey, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';

export const blogAuthors = mysqlTable('blog_authors', {
  id: idColumn(),
  name: text('name').notNull(),
  bio: text('bio'),
  avatarMediaId: fkColumn('avatar_media_id'),
  adminUserId: fkColumn('admin_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const blogCategories = mysqlTable('blog_categories', {
  id: idColumn(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
});

export const blogTags = mysqlTable('blog_tags', {
  id: idColumn(),
  slug: varchar('slug', { length: 150 }).notNull().unique(),
  name: text('name').notNull(),
});

/**
 * Mirrors the real fields the Astro site's content collection schema
 * (src/content.config.ts) already requires for a blog post, so this CMS
 * produces content that's a drop-in match for the existing frontmatter
 * shape rather than a diverging format — see docs/BLOG_CMS.md once
 * written for exactly how a row here maps to the exported .mdx file.
 */
export const blogPosts = mysqlTable(
  'blog_posts',
  {
    id: idColumn(),
    slug: varchar('slug', { length: 200 }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    bodyMarkdown: text('body_markdown'),
    authorId: fkColumn('author_id'),
    categoryId: fkColumn('category_id'),
    relatedServiceSlug: varchar('related_service_slug', { length: 150 }),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    coverMediaId: fkColumn('cover_media_id'),
    status: mysqlEnum('status', ['draft', 'scheduled', 'published']).notNull().default('draft'),
    publishedAt: datetime('published_at'),
    scheduledFor: datetime('scheduled_for'),
    createdByUserId: fkColumn('created_by_user_id'),
    createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('blog_posts_slug_idx').on(table.slug)],
);

export const blogPostTags = mysqlTable(
  'blog_post_tags',
  {
    postId: fkColumn('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    tagId: fkColumn('tag_id')
      .notNull()
      .references(() => blogTags.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.tagId] })],
);

export const blogPostFaqs = mysqlTable('blog_post_faqs', {
  id: idColumn(),
  postId: fkColumn('post_id')
    .notNull()
    .references(() => blogPosts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
});

export const blogPostRelations = mysqlTable(
  'blog_post_relations',
  {
    postId: fkColumn('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
    relatedPostId: fkColumn('related_post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.postId, table.relatedPostId] })],
);

/**
 * Upload metadata for the media library (Phase 14). The binary itself is
 * never stored in the database — `storagePath` points at wherever the
 * file actually lives (local disk under the app's writable storage dir,
 * or an object store once/if one is configured); this table is just the
 * validated, queryable record of what was uploaded, by whom, and with
 * what MIME type/dimensions, after passing the upload-validation checks
 * described in docs/ADMIN_ARCHITECTURE.md.
 */
export const media = mysqlTable('media', {
  id: idColumn(),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: int('size_bytes').notNull(),
  width: int('width'),
  height: int('height'),
  altText: text('alt_text'),
  uploadedByUserId: fkColumn('uploaded_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const aiKnowledgeSources = mysqlTable('ai_knowledge_sources', {
  id: idColumn(),
  title: text('title').notNull(),
  bodyMarkdown: text('body_markdown').notNull(),
  // An admin-approved knowledge source is eligible for the Luna chatbot to
  // draw on; unapproved drafts never reach the live chatbot's context.
  status: mysqlEnum('status', ['draft', 'approved', 'rejected']).notNull().default('draft'),
  approvedByUserId: fkColumn('approved_by_user_id'),
  approvedAt: datetime('approved_at'),
  createdByUserId: fkColumn('created_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const aiQuestions = mysqlTable('ai_questions', {
  id: idColumn(),
  // Logged questions the chatbot couldn't answer well, surfaced to an
  // admin to turn into a new knowledge source — never logs anything the
  // visitor didn't already type into the public chat widget itself.
  questionText: text('question_text').notNull(),
  conversationId: fkColumn('conversation_id'),
  reviewedByUserId: fkColumn('reviewed_by_user_id'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const aiConversations = mysqlTable('ai_conversations', {
  id: idColumn(),
  startedAt: datetime('started_at').notNull().$defaultFn(() => new Date()),
  metadata: json('metadata').$type<Record<string, unknown>>(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type Media = typeof media.$inferSelect;
