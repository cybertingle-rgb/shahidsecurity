import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { grantProductAccess, revokeProductAccess } from '@/lib/enrollment';

/**
 * Phase 6's core gap, caught from a real production report: a manually
 * granted membership never showed up on /dashboard/membership because that
 * page reads from the `memberships` table, while the grant action only
 * ever wrote to `enrollments`. These tests pin the fix — a product grant's
 * side effects (memberships row, community eligibility) — independently of
 * which admin action or payment flow triggers it.
 */

async function makeUser(email: string) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({ id, email, passwordHash: 'x', fullName: email, countryCode: 'PK' });
  return id;
}

async function makeProduct(type: 'course' | 'membership') {
  const id = crypto.randomUUID();
  await testDb.insert(schema.products).values({ id, type, name: `Test ${type}` });
  return id;
}

afterAll(closeTestDb);

describe('grantProductAccess / revokeProductAccess', () => {
  beforeEach(truncateAll);

  it('creates a memberships row for a membership-type product', async () => {
    const userId = await makeUser('member@enrollment.test');
    const productId = await makeProduct('membership');

    await grantProductAccess(userId, productId);

    const [membership] = await testDb.select().from(schema.memberships).where(eq(schema.memberships.userId, userId));
    expect(membership?.status).toBe('active');
  });

  it('does not create a memberships row for a non-membership (course) product', async () => {
    const userId = await makeUser('coursebuyer@enrollment.test');
    const productId = await makeProduct('course');

    await grantProductAccess(userId, productId);

    const rows = await testDb.select().from(schema.memberships).where(eq(schema.memberships.userId, userId));
    expect(rows).toHaveLength(0);
  });

  it('flips a gated community from not_eligible to eligible when its required product is granted', async () => {
    const userId = await makeUser('gated@enrollment.test');
    const productId = await makeProduct('membership');
    const communityId = crypto.randomUUID();
    await testDb.insert(schema.communities).values({ id: communityId, name: 'Gated Discord', platform: 'discord', url: 'https://discord.gg/x', requiredProductId: productId, status: 'active' });

    await grantProductAccess(userId, productId);

    const [access] = await testDb.select().from(schema.communityAccess).where(eq(schema.communityAccess.userId, userId));
    expect(access?.status).toBe('eligible');
  });

  it('revoking access downgrades an eligible (not yet invited) community grant back to not_eligible', async () => {
    const userId = await makeUser('revoke1@enrollment.test');
    const productId = await makeProduct('membership');
    const communityId = crypto.randomUUID();
    await testDb.insert(schema.communities).values({ id: communityId, name: 'Gated Discord', platform: 'discord', url: 'https://discord.gg/x', requiredProductId: productId, status: 'active' });

    await grantProductAccess(userId, productId);
    await revokeProductAccess(userId, productId);

    const [access] = await testDb.select().from(schema.communityAccess).where(eq(schema.communityAccess.userId, userId));
    expect(access?.status).toBe('not_eligible');

    const [membership] = await testDb.select().from(schema.memberships).where(eq(schema.memberships.userId, userId));
    expect(membership?.status).toBe('cancelled');
  });

  it('revoking access never pulls back a community grant that already reached invited/joined', async () => {
    const userId = await makeUser('revoke2@enrollment.test');
    const productId = await makeProduct('membership');
    const communityId = crypto.randomUUID();
    await testDb.insert(schema.communities).values({ id: communityId, name: 'Gated Discord', platform: 'discord', url: 'https://discord.gg/x', requiredProductId: productId, status: 'active' });

    await grantProductAccess(userId, productId);
    await testDb.update(schema.communityAccess).set({ status: 'joined' }).where(eq(schema.communityAccess.userId, userId));

    await revokeProductAccess(userId, productId);

    const [access] = await testDb.select().from(schema.communityAccess).where(eq(schema.communityAccess.userId, userId));
    expect(access?.status).toBe('joined');
  });
});
