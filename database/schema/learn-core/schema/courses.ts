import { boolean, datetime, int, json, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';

export const instructors = mysqlTable('instructors', {
  id: idColumn(),
  userId: fkColumn('user_id').references(() => users.id, { onDelete: 'set null' }),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  credentialsText: text('credentials_text'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const courses = mysqlTable('courses', {
  id: idColumn(),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  shortDescription: text('short_description'),
  fullDescription: text('full_description'),
  thumbnailUrl: text('thumbnail_url'),
  instructorId: fkColumn('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  category: text('category'),
  level: mysqlEnum('level', ['beginner', 'intermediate', 'advanced', 'expert']).notNull().default('beginner'),
  durationMinutes: int('duration_minutes'),
  language: varchar('language', { length: 10 }).notNull().default('en'),
  // No price column here on purpose — price lives in products/prices
  // (see commerce.ts) per lms-database.md, so a course can be free,
  // bundled, or priced per country without a schema change.
  status: mysqlEnum('status', ['draft', 'review', 'published', 'archived']).notNull().default('draft'),
  publishedAt: datetime('published_at'),
  featured: boolean('featured').notNull().default(false),
  // Structured curriculum-page content, entered on the same course form as
  // everything else — JSON arrays of plain strings, not a new sub-table,
  // since these are simple admin-authored lists with no independent
  // identity of their own.
  learningOutcomes: json('learning_outcomes').$type<string[]>(),
  requirements: json('requirements').$type<string[]>(),
  targetAudience: text('target_audience'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  ogImageUrl: text('og_image_url'),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const courseModules = mysqlTable('course_modules', {
  id: idColumn(),
  courseId: fkColumn('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
});

export const lessons = mysqlTable('lessons', {
  id: idColumn(),
  moduleId: fkColumn('module_id')
    .notNull()
    .references(() => courseModules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: mysqlEnum('type', [
    'video',
    'text',
    'pdf',
    'image',
    'code',
    'quiz',
    'assignment',
    'external_resource',
    'download',
  ]).notNull(),
  content: json('content').$type<Record<string, unknown>>(),
  isFreePreview: boolean('is_free_preview').notNull().default(false),
  requiresEnrollment: boolean('requires_enrollment').notNull().default(true),
  dripReleaseAt: datetime('drip_release_at'),
  dripReleaseDaysAfterEnrollment: int('drip_release_days_after_enrollment'),
  estimatedDurationMinutes: int('estimated_duration_minutes'),
  sortOrder: int('sort_order').notNull().default(0),
});

export const lessonVideoSources = mysqlTable('lesson_video_sources', {
  id: idColumn(),
  lessonId: fkColumn('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  provider: mysqlEnum('provider', ['youtube_unlisted', 'vimeo', 'cloud_storage', 'other']).notNull(),
  providerReference: text('provider_reference').notNull(),
  notes: text('notes'),
});
