import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';

export const courseLevelEnum = pgEnum('course_level', ['beginner', 'intermediate', 'advanced', 'expert']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'review', 'published', 'archived']);
export const lessonTypeEnum = pgEnum('lesson_type', [
  'video',
  'text',
  'pdf',
  'image',
  'code',
  'quiz',
  'assignment',
  'external_resource',
  'download',
]);
export const videoProviderEnum = pgEnum('video_provider', ['youtube_unlisted', 'vimeo', 'cloud_storage', 'other']);

export const instructors = pgTable('instructors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  displayName: text('display_name').notNull(),
  bio: text('bio'),
  photoUrl: text('photo_url'),
  credentialsText: text('credentials_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description'),
  fullDescription: text('full_description'),
  thumbnailUrl: text('thumbnail_url'),
  instructorId: uuid('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  category: text('category'),
  level: courseLevelEnum('level').notNull().default('beginner'),
  durationMinutes: integer('duration_minutes'),
  language: text('language').notNull().default('en'),
  // No price column here on purpose — price lives in products/prices
  // (see commerce.ts) per lms-database.md, so a course can be free,
  // bundled, or priced per country without a schema change.
  status: courseStatusEnum('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  featured: boolean('featured').notNull().default(false),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  canonicalUrl: text('canonical_url'),
  ogImageUrl: text('og_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courseModules = pgTable('course_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id')
    .notNull()
    .references(() => courseModules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: lessonTypeEnum('type').notNull(),
  content: jsonb('content').$type<Record<string, unknown>>(),
  isFreePreview: boolean('is_free_preview').notNull().default(false),
  requiresEnrollment: boolean('requires_enrollment').notNull().default(true),
  dripReleaseAt: timestamp('drip_release_at', { withTimezone: true }),
  dripReleaseDaysAfterEnrollment: integer('drip_release_days_after_enrollment'),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const lessonVideoSources = pgTable('lesson_video_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  provider: videoProviderEnum('provider').notNull(),
  providerReference: text('provider_reference').notNull(),
  notes: text('notes'),
});
