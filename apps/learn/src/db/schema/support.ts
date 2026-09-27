import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { users } from './identity';
import { courses, instructors } from './courses';

export const liveClassStatusEnum = pgEnum('live_class_status', ['scheduled', 'live', 'completed', 'cancelled']);
export const resourceTypeEnum = pgEnum('resource_type', ['article', 'tool', 'video', 'external_link', 'download']);
export const resourceStatusEnum = pgEnum('resource_status', ['draft', 'published']);
export const announcementTargetEnum = pgEnum('announcement_target', ['all', 'membership', 'course', 'group']);
export const supportTicketStatusEnum = pgEnum('support_ticket_status', ['open', 'in_progress', 'resolved', 'closed']);

// V2 — schema exists now (Phase 2), no live-class feature ships in V1.
export const liveClasses = pgTable('live_classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  instructorId: uuid('instructor_id')
    .notNull()
    .references(() => instructors.id, { onDelete: 'cascade' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  timezone: text('timezone').notNull().default('Asia/Karachi'),
  meetingUrl: text('meeting_url').notNull(),
  recordingUrl: text('recording_url'),
  status: liveClassStatusEnum('status').notNull().default('scheduled'),
});

export const liveClassAttendance = pgTable('live_class_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  liveClassId: uuid('live_class_id')
    .notNull()
    .references(() => liveClasses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  attended: boolean('attended').notNull().default(false),
});

export const roadmapStages = pgTable('roadmap_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  levelNumber: integer('level_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  prerequisitesText: text('prerequisites_text'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  type: resourceTypeEnum('type').notNull(),
  urlOrFile: text('url_or_file').notNull(),
  relatedRoadmapStageId: uuid('related_roadmap_stage_id').references(() => roadmapStages.id, { onDelete: 'set null' }),
  relatedCourseId: uuid('related_course_id').references(() => courses.id, { onDelete: 'set null' }),
  status: resourceStatusEnum('status').notNull().default('draft'),
});

export const roadmapStageResources = pgTable('roadmap_stage_resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadmapStageId: uuid('roadmap_stage_id')
    .notNull()
    .references(() => roadmapStages.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
  resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'set null' }),
  // Blog articles live on the other codebase (the Astro marketing site),
  // so they aren't a foreign key target — see docs/lms-database.md.
  externalLinks: jsonb('external_links').$type<Array<{ type: string; url: string; label: string }>>(),
});

export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  targetType: announcementTargetEnum('target_type').notNull().default('all'),
  targetId: uuid('target_id'),
  channels: jsonb('channels').$type<{ dashboard: boolean; email: boolean }>(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  status: supportTicketStatusEnum('status').notNull().default('open'),
  relatedCourseId: uuid('related_course_id').references(() => courses.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const supportTicketMessages = pgTable('support_ticket_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderUserId: uuid('sender_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
