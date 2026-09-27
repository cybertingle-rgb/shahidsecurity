import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './identity';
import { courses, instructors } from './courses';
import { enrollments } from './enrollment';

// V2 tables — schema exists now per LMS_IMPLEMENTATION_PLAN.md's "Phase 2
// creates the full schema" note, but no certificate-issuance feature code
// runs in V1 (see docs/LMS_V1_SCOPE.md).
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateNumber: text('certificate_number').notNull().unique(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  enrollmentId: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  instructorId: uuid('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  title: text('title').notNull().default('Certificate of Course Completion'),
});

export const certificateVerifications = pgTable('certificate_verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateId: uuid('certificate_id')
    .notNull()
    .references(() => certificates.id, { onDelete: 'cascade' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
  verifierIp: text('verifier_ip'),
});
