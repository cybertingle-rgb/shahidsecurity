import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import { hashPassword } from '../lib/auth/password';

/**
 * Entirely fake seed data for local development/testing only — never a
 * copy of real student data, per docs/lms-deployment.md's "Environments"
 * section. All accounts use the .test TLD (RFC 2606, reserved and
 * guaranteed never to resolve as a real domain).
 *
 * MySQL has no RETURNING clause, so every insert here generates its id
 * with crypto.randomUUID() up front and uses that value directly, rather
 * than reading a row back after inserting it.
 */

const DEV_PASSWORD = 'DevPassword123!';

const PERMISSION_KEYS = [
  'users.manage',
  'roles.manage',
  'courses.create',
  'courses.update',
  'courses.delete',
  'courses.publish',
  'enrollments.manage',
  'products.manage',
  'prices.manage',
  'orders.manage',
  'payments.verify',
  'payments.refund',
  'communities.manage',
  'announcements.manage',
  'certificates.manage',
  'coupons.manage',
  'settings.manage',
  'audit_logs.view',
] as const;

const ROADMAP_STAGES: Array<{ level: number; title: string; required: boolean; prerequisites: string }> = [
  { level: 1, title: 'IT & Computer Fundamentals', required: false, prerequisites: 'None' },
  { level: 2, title: 'Networking Fundamentals', required: false, prerequisites: 'Helpful: basic IT fundamentals' },
  { level: 3, title: 'Linux', required: false, prerequisites: 'Helpful: command-line comfort' },
  { level: 4, title: 'Windows & Active Directory', required: false, prerequisites: 'Helpful: networking basics' },
  { level: 5, title: 'Cybersecurity Fundamentals', required: true, prerequisites: 'Genuinely needed before most later stages' },
  { level: 6, title: 'Security Operations / SOC', required: false, prerequisites: 'Helpful: fundamentals + networking' },
  { level: 7, title: 'SIEM & Log Analysis', required: false, prerequisites: 'Helpful: SOC basics' },
  { level: 8, title: 'Threat Detection', required: false, prerequisites: 'Helpful: SIEM basics' },
  { level: 9, title: 'Incident Response', required: false, prerequisites: 'Helpful: threat detection' },
  { level: 10, title: 'Vulnerability Assessment', required: false, prerequisites: 'Helpful: networking + Linux' },
  { level: 11, title: 'Web Application Security', required: false, prerequisites: 'Helpful: web fundamentals' },
  { level: 12, title: 'Penetration Testing', required: false, prerequisites: 'Genuinely needed: vulnerability assessment' },
  { level: 13, title: 'Cloud Security', required: false, prerequisites: 'Helpful: networking + Linux' },
  { level: 14, title: 'Threat Intelligence', required: false, prerequisites: 'Helpful: threat detection' },
  { level: 15, title: 'Digital Forensics', required: false, prerequisites: 'Helpful: incident response' },
  { level: 16, title: 'Red Team / Advanced Security', required: false, prerequisites: 'Genuinely needed: penetration testing' },
  { level: 17, title: 'Security Research', required: false, prerequisites: 'Helpful: broad prior experience' },
  { level: 18, title: 'Career Preparation', required: false, prerequisites: 'None — relevant at any stage' },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to seed');

  const pool = mysql.createPool({ uri: connectionString, timezone: 'Z' });
  const db = drizzle(pool, { schema, mode: 'default' });

  console.log('Seeding permissions...');
  const permByKey = new Map<string, { id: string; key: string }>();
  for (const key of PERMISSION_KEYS) {
    const [existing] = await db.select().from(schema.permissions).where(eq(schema.permissions.key, key));
    if (existing) {
      permByKey.set(key, existing);
      continue;
    }
    const id = crypto.randomUUID();
    await db.insert(schema.permissions).values({ id, key });
    permByKey.set(key, { id, key });
  }

  console.log('Seeding roles...');
  async function upsertRole(name: string, description: string) {
    const [existing] = await db.select().from(schema.roles).where(eq(schema.roles.name, name));
    if (existing) return existing;
    const id = crypto.randomUUID();
    await db.insert(schema.roles).values({ id, name, description });
    return { id, name, description, createdAt: new Date() };
  }

  const superAdminRole = await upsertRole('super_admin', 'Full access to everything.');
  const adminRole = await upsertRole('admin', 'Full operational access, except managing other roles.');
  const instructorRole = await upsertRole('instructor', 'Scoped to their own assigned courses.');
  const studentRole = await upsertRole('student', 'Default role for every registered account.');

  async function grant(roleId: string, keys: readonly string[]) {
    for (const key of keys) {
      const perm = permByKey.get(key);
      if (!perm) continue;
      const [existing] = await db
        .select()
        .from(schema.rolePermissions)
        .where(and(eq(schema.rolePermissions.roleId, roleId), eq(schema.rolePermissions.permissionId, perm.id)));
      if (!existing) await db.insert(schema.rolePermissions).values({ roleId, permissionId: perm.id });
    }
  }

  await grant(superAdminRole.id, PERMISSION_KEYS);
  await grant(
    adminRole.id,
    PERMISSION_KEYS.filter((k) => k !== 'roles.manage'),
  );
  // Instructor/student get no admin permissions in V1 — instructor scoping
  // to "their own courses" is a query-shape rule (docs/lms-security.md),
  // not a coarse permission.

  console.log('Seeding test users...');
  async function upsertUser(email: string, fullName: string, roleId: string, emailVerified: boolean) {
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    let user = existing;
    if (!user) {
      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(DEV_PASSWORD);
      await db.insert(schema.users).values({ id, email, passwordHash, fullName, emailVerifiedAt: emailVerified ? new Date() : null });
      const [inserted] = await db.select().from(schema.users).where(eq(schema.users.id, id));
      if (!inserted) throw new Error(`Failed to insert user: ${email}`);
      user = inserted;
    }
    const [existingRole] = await db.select().from(schema.userRoles).where(and(eq(schema.userRoles.userId, user.id), eq(schema.userRoles.roleId, roleId)));
    if (!existingRole) await db.insert(schema.userRoles).values({ userId: user.id, roleId });
    return user;
  }

  await upsertUser('superadmin@learnwithshahid.test', 'Super Admin (seed)', superAdminRole.id, true);
  await upsertUser('admin@learnwithshahid.test', 'Admin (seed)', adminRole.id, true);
  const instructorUser = await upsertUser('instructor@learnwithshahid.test', 'Instructor (seed)', instructorRole.id, true);
  await upsertUser('student.a@learnwithshahid.test', 'Student A (seed)', studentRole.id, true);
  await upsertUser('student.b@learnwithshahid.test', 'Student B (seed)', studentRole.id, true);

  console.log('Seeding the Learn with Shahid Enrollment product (PKR 800)...');
  const [existingProduct] = await db.select().from(schema.products).where(eq(schema.products.name, 'Learn with Shahid Enrollment'));
  let enrollmentProductId = existingProduct?.id;
  if (!enrollmentProductId) {
    enrollmentProductId = crypto.randomUUID();
    await db.insert(schema.products).values({
      id: enrollmentProductId,
      type: 'membership',
      name: 'Learn with Shahid Enrollment',
      description: 'Student dashboard, cybersecurity roadmap, eligible learning resources, community access, and announcements.',
      status: 'active',
      accessRules: { grants: ['dashboard', 'roadmap', 'community', 'announcements'] },
    });
  }

  const [existingPrice] = await db.select().from(schema.prices).where(eq(schema.prices.productId, enrollmentProductId));
  if (!existingPrice) {
    // 800 PKR stored as 80000 minor units — ISO 4217 gives PKR a 2-decimal
    // minor unit, same convention used for every currency in this table
    // (docs/lms-database.md) so the "never hardcode PKR 800" requirement
    // holds structurally: this is the ONE place the number 800 appears.
    await db.insert(schema.prices).values({
      id: crypto.randomUUID(),
      productId: enrollmentProductId,
      currencyCode: 'PKR',
      countryCode: null,
      amount: 80000,
    });
  }

  console.log('Seeding a sample course...');
  const [existingInstructorProfile] = await db.select().from(schema.instructors).where(eq(schema.instructors.userId, instructorUser.id));
  let instructorProfileId = existingInstructorProfile?.id;
  if (!instructorProfileId) {
    instructorProfileId = crypto.randomUUID();
    await db
      .insert(schema.instructors)
      .values({ id: instructorProfileId, userId: instructorUser.id, displayName: 'Instructor (seed)', bio: 'Seed data for local development.' });
  }

  const [existingCourse] = await db.select().from(schema.courses).where(eq(schema.courses.slug, 'soc-analyst-fundamentals-sample'));
  if (!existingCourse) {
    const courseId = crypto.randomUUID();
    await db.insert(schema.courses).values({
      id: courseId,
      title: 'SOC Analyst Fundamentals (sample)',
      slug: 'soc-analyst-fundamentals-sample',
      shortDescription: 'Seed course for local development and testing only.',
      instructorId: instructorProfileId,
      level: 'beginner',
      status: 'published',
      publishedAt: new Date(),
    });

    const moduleId = crypto.randomUUID();
    await db.insert(schema.courseModules).values({ id: moduleId, courseId, title: 'Getting started', sortOrder: 0 });
    await db.insert(schema.lessons).values({
      id: crypto.randomUUID(),
      moduleId,
      title: 'Welcome',
      type: 'text',
      content: { body: 'Seed lesson content.' },
      isFreePreview: true,
      sortOrder: 0,
    });
  }

  console.log('Seeding roadmap stages...');
  const existingStages = await db.select({ id: schema.roadmapStages.id }).from(schema.roadmapStages).limit(1);
  if (existingStages.length === 0) {
    for (const stage of ROADMAP_STAGES) {
      await db.insert(schema.roadmapStages).values({
        id: crypto.randomUUID(),
        levelNumber: stage.level,
        title: stage.title,
        isRequired: stage.required,
        prerequisitesText: stage.prerequisites,
        sortOrder: stage.level,
      });
    }
  }

  console.log('Seeding settings...');
  async function upsertSetting(key: string, value: unknown) {
    const [existing] = await db.select().from(schema.settings).where(eq(schema.settings.key, key));
    if (!existing) await db.insert(schema.settings).values({ id: crypto.randomUUID(), key, value });
  }
  await upsertSetting('default_enrollment_product_id', enrollmentProductId);
  await upsertSetting('support_email', 'support@shahidiqbal.com');

  console.log('Seed complete.');
  console.log(`Dev password for all seeded accounts: ${DEV_PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
