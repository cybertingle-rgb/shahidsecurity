import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';

// These exercise the actual functions the dashboard pages call
// (src/lib/student/data.ts), not just the query shape — every one of them
// takes only a userId and must never surface another student's rows, even
// when that student's id is known (e.g. guessed sequential-looking UUIDs
// aren't sequential, but the point of these tests is that it wouldn't
// matter if they were: there is no id parameter to substitute).
import { getMyEnrollments, getContinueLearning, getMyMembership, getMyCommunities, getMyOrders, getMyProfile } from '@/lib/student/data';

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, phone: '+920000000000', countryCode: 'PK' });
  return { id, email };
}

async function makeProduct(type: 'course' | 'membership' = 'course') {
  const id = crypto.randomUUID();
  await testDb.insert(schema.products).values({ id, type, name: `Test ${type}` });
  return id;
}

afterAll(closeTestDb);

describe('Student dashboard data layer — IDOR prevention', () => {
  beforeEach(truncateAll);

  it('getMyEnrollments never returns another student\'s enrollment', async () => {
    const studentA = await makeUser('student.a@idor2.test');
    const studentB = await makeUser('student.b@idor2.test');
    const productId = await makeProduct();
    const courseId = crypto.randomUUID();
    await testDb.insert(schema.courses).values({ id: courseId, title: 'B\'s course', slug: 'bs-course' });
    await testDb.insert(schema.enrollments).values({
      id: crypto.randomUUID(),
      userId: studentB.id,
      productId,
      courseId,
      status: 'active',
      source: 'manual_admin_grant',
    });

    const aEnrollments = await getMyEnrollments(studentA.id);
    expect(aEnrollments).toHaveLength(0);

    const bEnrollments = await getMyEnrollments(studentB.id);
    expect(bEnrollments).toHaveLength(1);
  });

  it('getContinueLearning never surfaces another student\'s in-progress course', async () => {
    const studentA = await makeUser('student.a@idor3.test');
    const studentB = await makeUser('student.b@idor3.test');
    const productId = await makeProduct();
    const courseId = crypto.randomUUID();
    await testDb.insert(schema.courses).values({ id: courseId, title: 'B\'s in-progress course', slug: 'bs-inprogress' });
    const enrollmentId = crypto.randomUUID();
    await testDb.insert(schema.enrollments).values({ id: enrollmentId, userId: studentB.id, productId, courseId, status: 'active', source: 'manual_admin_grant' });
    await testDb.insert(schema.courseProgress).values({ id: crypto.randomUUID(), enrollmentId, percentComplete: 40 });

    expect(await getContinueLearning(studentA.id)).toBeNull();
    expect(await getContinueLearning(studentB.id)).not.toBeNull();
  });

  it('getMyMembership never returns another student\'s membership', async () => {
    const studentA = await makeUser('student.a@idor4.test');
    const studentB = await makeUser('student.b@idor4.test');
    const productId = await makeProduct('membership');
    await testDb.insert(schema.memberships).values({ id: crypto.randomUUID(), userId: studentB.id, productId, status: 'active' });

    expect(await getMyMembership(studentA.id)).toBeNull();
    expect(await getMyMembership(studentB.id)).not.toBeNull();
  });

  it('getMyCommunities never returns another student\'s community access or invite link', async () => {
    const studentA = await makeUser('student.a@idor5.test');
    const studentB = await makeUser('student.b@idor5.test');
    const communityId = crypto.randomUUID();
    await testDb.insert(schema.communities).values({ id: communityId, name: 'Test Discord', platform: 'discord', status: 'active', url: 'https://discord.gg/secret-invite' });
    await testDb.insert(schema.communityAccess).values({ userId: studentB.id, communityId, status: 'invited' });

    const aCommunities = await getMyCommunities(studentA.id);
    expect(aCommunities).toHaveLength(0);

    const bCommunities = await getMyCommunities(studentB.id);
    expect(bCommunities).toHaveLength(1);
    expect(bCommunities[0]?.url).toBe('https://discord.gg/secret-invite');
  });

  it('getMyOrders never returns another student\'s order history', async () => {
    const studentA = await makeUser('student.a@idor6.test');
    const studentB = await makeUser('student.b@idor6.test');
    const productId = await makeProduct();
    await testDb.insert(schema.orders).values({
      id: crypto.randomUUID(),
      orderNumber: 'ORD-IDOR-1',
      userId: studentB.id,
      productId,
      amount: 80000,
      currencyCode: 'PKR',
      status: 'paid',
    });

    expect(await getMyOrders(studentA.id)).toHaveLength(0);
    expect(await getMyOrders(studentB.id)).toHaveLength(1);
  });

  it('getMyProfile never returns another student\'s profile row', async () => {
    const studentA = await makeUser('student.a@idor7.test');
    const studentB = await makeUser('student.b@idor7.test');

    const aProfile = await getMyProfile(studentA.id);
    expect(aProfile?.email).toBe('student.a@idor7.test');

    const bProfile = await getMyProfile(studentB.id);
    expect(bProfile?.email).toBe('student.b@idor7.test');

    // Passing a well-formed but nonexistent id (the shape a guessed/enumerated
    // id would take) returns nothing rather than falling back to any row.
    expect(await getMyProfile(crypto.randomUUID())).toBeNull();
  });
});
