import { boolean, datetime, int, json, mysqlEnum, mysqlTable, text } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';
import { courses, lessons } from './courses';
import { products } from './commerce';

export const enrollments = mysqlTable('enrollments', {
  id: idColumn(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: fkColumn('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  productId: fkColumn('product_id').references(() => products.id, { onDelete: 'set null' }),
  source: mysqlEnum('source', ['purchase', 'membership', 'manual_admin_grant', 'coupon']).notNull(),
  status: mysqlEnum('status', ['active', 'revoked', 'expired']).notNull().default('active'),
  enrolledAt: datetime('enrolled_at').notNull().$defaultFn(() => new Date()),
  expiresAt: datetime('expires_at'),
});

export const lessonProgress = mysqlTable('lesson_progress', {
  id: idColumn(),
  enrollmentId: fkColumn('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  lessonId: fkColumn('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['not_started', 'in_progress', 'completed']).notNull().default('not_started'),
  watchProgressSeconds: int('watch_progress_seconds'),
  startedAt: datetime('started_at'),
  completedAt: datetime('completed_at'),
});

export const courseProgress = mysqlTable('course_progress', {
  id: idColumn(),
  enrollmentId: fkColumn('enrollment_id')
    .notNull()
    .unique()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  percentComplete: int('percent_complete').notNull().default(0),
  lastLessonId: fkColumn('last_lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  updatedAt: datetime('updated_at').notNull().$defaultFn(() => new Date()),
});

export const quizzes = mysqlTable('quizzes', {
  id: idColumn(),
  lessonId: fkColumn('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  passingPercentage: int('passing_percentage').notNull().default(70),
  maxAttempts: int('max_attempts'),
  randomizeQuestions: boolean('randomize_questions').notNull().default(false),
  timeLimitMinutes: int('time_limit_minutes'),
  showAnswersAfterSubmit: boolean('show_answers_after_submit').notNull().default(true),
});

export const quizQuestions = mysqlTable('quiz_questions', {
  id: idColumn(),
  quizId: fkColumn('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['multiple_choice', 'multiple_answer', 'true_false', 'short_answer']).notNull(),
  prompt: text('prompt').notNull(),
  options: json('options').$type<string[]>(),
  correctAnswer: json('correct_answer').$type<unknown>(),
  explanation: text('explanation'),
  sortOrder: int('sort_order').notNull().default(0),
});

export const quizAttempts = mysqlTable('quiz_attempts', {
  id: idColumn(),
  quizId: fkColumn('quiz_id')
    .notNull()
    .references(() => quizzes.id, { onDelete: 'cascade' }),
  enrollmentId: fkColumn('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  answers: json('answers').$type<Record<string, unknown>>(),
  scorePercentage: int('score_percentage'),
  passed: boolean('passed'),
  startedAt: datetime('started_at').notNull().$defaultFn(() => new Date()),
  submittedAt: datetime('submitted_at'),
});

export const assignments = mysqlTable('assignments', {
  id: idColumn(),
  lessonId: fkColumn('lesson_id')
    .notNull()
    .references(() => lessons.id, { onDelete: 'cascade' }),
  instructions: text('instructions').notNull(),
  submissionType: mysqlEnum('submission_type', ['text', 'file_upload', 'external_link']).notNull(),
});

export const assignmentSubmissions = mysqlTable('assignment_submissions', {
  id: idColumn(),
  assignmentId: fkColumn('assignment_id')
    .notNull()
    .references(() => assignments.id, { onDelete: 'cascade' }),
  enrollmentId: fkColumn('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  content: json('content').$type<Record<string, unknown>>(),
  fileUrl: text('file_url'),
  status: mysqlEnum('status', ['submitted', 'reviewed', 'needs_revision']).notNull().default('submitted'),
  instructorFeedback: text('instructor_feedback'),
  submittedAt: datetime('submitted_at').notNull().$defaultFn(() => new Date()),
  reviewedAt: datetime('reviewed_at'),
});
