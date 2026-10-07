import { datetime, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { idColumn, fkColumn } from './columns';
import { users } from './identity';
import { courses, instructors } from './courses';
import { enrollments } from './enrollment';

// V2 tables — schema exists now per LMS_IMPLEMENTATION_PLAN.md's "Phase 2
// creates the full schema" note, but no certificate-issuance feature code
// runs in V1 (see docs/LMS_V1_SCOPE.md).
export const certificates = mysqlTable('certificates', {
  id: idColumn(),
  certificateNumber: varchar('certificate_number', { length: 64 }).notNull().unique(),
  userId: fkColumn('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: fkColumn('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  enrollmentId: fkColumn('enrollment_id')
    .notNull()
    .references(() => enrollments.id, { onDelete: 'cascade' }),
  issuedAt: datetime('issued_at').notNull().$defaultFn(() => new Date()),
  instructorId: fkColumn('instructor_id').references(() => instructors.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull().default('Certificate of Course Completion'),
});

export const certificateVerifications = mysqlTable('certificate_verifications', {
  id: idColumn(),
  certificateId: fkColumn('certificate_id')
    .notNull()
    .references(() => certificates.id, { onDelete: 'cascade' }),
  verifiedAt: datetime('verified_at').notNull().$defaultFn(() => new Date()),
  verifierIp: text('verifier_ip'),
});
