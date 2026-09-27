import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';
import { courses, lessons } from './courses';
import { products } from './commerce';

export const enrollmentSourceEnum = pgEnum('enrollment_source', ['purchase', 'membership', 'manual_admin_grant', 'coupon']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'revoked', 'expired']);
export const progressStatusEnum = pgEnum('progress_status', ['not_started', 'in_progress', 'completed']);
export const quizQuestionTypeEnum = pgEnum('quiz_question_type', ['multiple_choice', 'multiple_answer', 'true_false', 'short_answer']);
export const assignmentSubmissionTypeEnum = pgEnum('assignment_submission_type', ['text', 'file_upload', 'external_link']);
export const assignmentSubmissionStatusEnum = pgEnum('assignment_submission_status', ['submitted', 'reviewed', 'needs_revision']);

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  source: enrollmentSourceEnum('source').notNull(),
  status: enrollmentStatusEnum('status').notNull().default('active'),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  status: progressStatusEnum('status').notNull().default('not_started'),
  watchProgressSeconds: integer('watch_progress_seconds'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const courseProgress = pgTable('course_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .unique()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  percentComplete: integer('percent_complete').notNull().default(0),
  lastLessonId: uuid('last_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  passingPercentage: integer('passing_percentage').notNull().default(70),
  maxAttempts: integer('max_attempts'),
  randomizeQuestions: boolean('randomize_questions').notNull().default(false),
  timeLimitMinutes: integer('time_limit_minutes'),
  showAnswersAfterSubmit: boolean('show_answers_after_submit').notNull().default(true),
});

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  type: quizQuestionTypeEnum('type').notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(),
  correctAnswer: jsonb('correct_answer').$type<unknown>(),
  explanation: text('explanation'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').$type<Record<string, unknown>>(),
  scorePercentage: integer('score_percentage'),
  passed: boolean('passed'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
});

export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  lessonId: uuid('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  instructions: text('instructions').notNull(),
  submissionType: assignmentSubmissionTypeEnum('submission_type').notNull(),
});

export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id')
    .notNull()
    .references(() => assignments.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<Record<string, unknown>>(),
  fileUrl: text('file_url'),
  status: assignmentSubmissionStatusEnum('status').notNull().default('submitted'),
  instructorFeedback: text('instructor_feedback'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});
