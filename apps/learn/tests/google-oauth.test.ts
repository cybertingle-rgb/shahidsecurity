import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';
import { resolveOrCreateGoogleUser } from '@/lib/auth/google';

async function makeStudentRole() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.roles).values({ id, name: 'student' });
  return id;
}

async function makeUser(opts: { email: string; emailVerifiedAt?: Date | null; status?: 'active' | 'suspended' }) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.users).values({
    id,
    email: opts.email,
    passwordHash: 'x',
    fullName: opts.email,
    emailVerifiedAt: opts.emailVerifiedAt ?? null,
    status: opts.status ?? 'active',
  });
  return id;
}

afterAll(closeTestDb);

describe('resolveOrCreateGoogleUser', () => {
  beforeEach(truncateAll);

  it('refuses an unverified Google email rather than creating or linking anything', async () => {
    const result = await resolveOrCreateGoogleUser({ sub: 'g-1', email: 'nope@example.com', emailVerified: false, name: 'Nope' });
    expect(result).toEqual({ error: 'google_email_unverified' });

    const users = await testDb.select().from(schema.users);
    expect(users).toHaveLength(0);
  });

  it('creates a new, pre-verified user and assigns the student role on first sign-in', async () => {
    const studentRoleId = await makeStudentRole();

    const result = await resolveOrCreateGoogleUser({ sub: 'g-2', email: 'new@example.com', emailVerified: true, name: 'New Student' });
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.email).toBe('new@example.com');
    expect(result.fullName).toBe('New Student');
    expect(result.status).toBe('active');

    const [user] = await testDb.select().from(schema.users).where(eq(schema.users.id, result.id));
    expect(user?.emailVerifiedAt).not.toBeNull();

    const [role] = await testDb.select().from(schema.userRoles).where(and(eq(schema.userRoles.userId, result.id), eq(schema.userRoles.roleId, studentRoleId)));
    expect(role).toBeDefined();

    const [account] = await testDb.select().from(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, result.id));
    expect(account?.provider).toBe('google');
    expect(account?.providerAccountId).toBe('g-2');
  });

  it('links to an existing password-based account with the same verified email instead of creating a duplicate', async () => {
    const existingId = await makeUser({ email: 'existing@example.com', emailVerifiedAt: null });

    const result = await resolveOrCreateGoogleUser({ sub: 'g-3', email: 'existing@example.com', emailVerified: true, name: 'Existing' });
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.id).toBe(existingId);

    const users = await testDb.select().from(schema.users);
    expect(users).toHaveLength(1);

    const [user] = await testDb.select().from(schema.users).where(eq(schema.users.id, existingId));
    expect(user?.emailVerifiedAt).not.toBeNull();
  });

  it('reuses the linked account on a repeat sign-in, matched by Google sub rather than email', async () => {
    await makeStudentRole();
    const first = await resolveOrCreateGoogleUser({ sub: 'g-4', email: 'repeat@example.com', emailVerified: true, name: 'Repeat' });
    if ('error' in first) throw new Error('unexpected error');

    const second = await resolveOrCreateGoogleUser({ sub: 'g-4', email: 'repeat@example.com', emailVerified: true, name: 'Repeat' });
    if ('error' in second) throw new Error('unexpected error');

    expect(second.id).toBe(first.id);
    const users = await testDb.select().from(schema.users);
    expect(users).toHaveLength(1);
  });

  it('surfaces a suspended account rather than silently signing them in', async () => {
    await makeUser({ email: 'suspended@example.com', emailVerifiedAt: new Date(), status: 'suspended' });

    const result = await resolveOrCreateGoogleUser({ sub: 'g-5', email: 'suspended@example.com', emailVerified: true, name: 'Suspended' });
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.status).toBe('suspended');
  });
});
