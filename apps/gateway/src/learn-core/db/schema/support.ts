import { boolean, datetime, int, json, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';
import { courses, instructors } from './courses';
import { products, orders } from './commerce';

// V2 — schema exists now (Phase 2), no live-class feature ships in V1.
export const liveClasses = mysqlTable('live_classes', {
  id: idColumn(),
  courseId: fkColumn('course_id').references(() => courses.id, { onDelete: 'set null' }),
  instructorId: fkColumn('instructor_id')
    .notNull()
    .references(() => instructors.id, { onDelete: 'cascade' }),
  scheduledAt: datetime('scheduled_at').notNull(),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Karachi'),
  meetingUrl: text('meeting_url').notNull(),
  recordingUrl: text('recording_url'),
  status: mysqlEnum('status', ['scheduled', 'live', 'completed', 'cancelled']).notNull().default('scheduled'),
});

export const liveClassAttendance = mysqlTable('live_class_attendance', {
  id: idColumn(),
  liveClassId: fkColumn('live_class_id')
    .notNull()
    .references(() => liveClasses.id, { onDelete: 'cascade' }),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: datetime('joined_at'),
  attended: boolean('attended').notNull().default(false),
});

export const roadmapStages = mysqlTable('roadmap_stages', {
  id: idColumn(),
  levelNumber: int('level_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  prerequisitesText: text('prerequisites_text'),
  isRequired: boolean('is_required').notNull().default(false),
  sortOrder: int('sort_order').notNull().default(0),
});

export const resources = mysqlTable('resources', {
  id: idColumn(),
  title: text('title').notNull(),
  description: text('description'),
  type: mysqlEnum('type', ['article', 'tool', 'video', 'external_link', 'download']).notNull(),
  urlOrFile: text('url_or_file').notNull(),
  relatedRoadmapStageId: fkColumn('related_roadmap_stage_id').references(() => roadmapStages.id, { onDelete: 'set null' }),
  relatedCourseId: fkColumn('related_course_id').references(() => courses.id, { onDelete: 'set null' }),
  status: mysqlEnum('status', ['draft', 'published']).notNull().default('draft'),
});

export const roadmapStageResources = mysqlTable('roadmap_stage_resources', {
  id: idColumn(),
  roadmapStageId: fkColumn('roadmap_stage_id')
    .notNull()
    .references(() => roadmapStages.id, { onDelete: 'cascade' }),
  courseId: fkColumn('course_id').references(() => courses.id, { onDelete: 'set null' }),
  resourceId: fkColumn('resource_id').references(() => resources.id, { onDelete: 'set null' }),
  // Blog articles live on the other codebase (the Astro marketing site),
  // so they aren't a foreign key target — see docs/lms-database.md.
  externalLinks: json('external_links').$type<Array<{ type: string; url: string; label: string }>>(),
});

export const announcements = mysqlTable('announcements', {
  id: idColumn(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  targetType: mysqlEnum('target_type', ['all', 'membership', 'course', 'group']).notNull().default('all'),
  // No FK on purpose — polymorphic target (a course id, a membership id,
  // etc. depending on targetType), matching the original design.
  targetId: fkColumn('target_id'),
  channels: json('channels').$type<{ dashboard: boolean; email: boolean }>(),
  publishedAt: datetime('published_at').notNull().$defaultFn(() => new Date()),
});

export const supportTickets = mysqlTable('support_tickets', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  status: mysqlEnum('status', ['open', 'in_progress', 'resolved', 'closed']).notNull().default('open'),
  relatedCourseId: fkColumn('related_course_id').references(() => courses.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

export const supportTicketMessages = mysqlTable('support_ticket_messages', {
  id: idColumn(),
  ticketId: fkColumn('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderUserId: fkColumn('sender_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
});

/**
 * A student's request to discuss Personal Training — instructor-led,
 * arranged around their own goals/skill level, never sold at a fixed
 * catalog price. This is deliberately NOT a purchase: submitting one
 * never creates an order or charges anything (see lib/personalTraining.ts).
 * `productId` always points at the one real "Personal Training" product
 * (type: 'mentoring' — see ensurePersonalTrainingProduct) which is
 * created with no row in `prices` at all; that absence is how an
 * unconfigured/not-yet-announced price is represented, reusing the
 * existing products/prices model instead of adding a nullable price
 * column or a magic sentinel value that could be confused with a real
 * $0 free course.
 *
 * `agreedPriceAmount`/`agreedCurrencyCode` only get set once Shahid and
 * the student have actually discussed scope/availability/price — never
 * at submission. Setting them is not itself a charge; the student still
 * has to explicitly accept before `convertedOrderId` is ever set (see
 * acceptTrainingRequestOffer in lib/personalTraining.ts), so no payment
 * amount is ever created before the student has agreed to it.
 */
export const trainingRequests = mysqlTable('training_requests', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: fkColumn('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  contactName: text('contact_name').notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  areaOfInterest: text('area_of_interest').notNull(),
  experienceLevel: mysqlEnum('experience_level', ['beginner', 'intermediate', 'advanced', 'expert']).notNull(),
  goals: text('goals').notNull(),
  specialRequest: text('special_request'),
  formatPreference: mysqlEnum('format_preference', ['one_on_one', 'group', 'no_preference']).notNull().default('no_preference'),
  preferredAvailability: text('preferred_availability'),
  status: mysqlEnum('status', ['new', 'reviewing', 'contacted', 'approved', 'declined', 'converted']).notNull().default('new'),
  // Admin-only — never read on any student-facing page/API. See
  // src/lib/learn/trainingRequests.ts (apps/admin) / the student-facing
  // read path in this app, both of which select every other column
  // explicitly and never this one.
  internalNotes: text('internal_notes'),
  agreedPriceAmount: int('agreed_price_amount'),
  agreedCurrencyCode: varchar('agreed_currency_code', { length: 3 }),
  // Set only after the student explicitly accepts the agreed price —
  // the one and only link from a request to real money changing hands.
  convertedOrderId: fkColumn('converted_order_id').references(() => orders.id, { onDelete: 'set null' }),
  // No FK, by design — mirrors payments.verifiedByUserId above: the
  // acting admin is a row in apps/admin's own adminUsers table, a
  // different database, not a Learn user. Their email goes into the
  // audit log metadata (logLearnAudit) instead.
  reviewedByUserId: fkColumn('reviewed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at').notNull().$defaultFn(() => new Date()),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});
