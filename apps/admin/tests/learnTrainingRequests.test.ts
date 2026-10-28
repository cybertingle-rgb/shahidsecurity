import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';
import {
  listTrainingRequests,
  getTrainingRequest,
  setTrainingRequestStatus,
  setTrainingRequestInternalNotes,
  setTrainingRequestAgreedPrice,
  isTrainingRequestStatus,
} from '@/lib/learn/trainingRequests';

const { products, trainingRequests, users } = learnSchema;

// Connects to apps/learn's own test database — see tests/learnCourses.test.ts
// for the same pattern and the reason each test cleans up only its own
// rows rather than truncating a database shared with apps/learn's suite.
const createdUserIds: string[] = [];
const createdProductIds: string[] = [];
const createdRequestIds: string[] = [];

afterEach(async () => {
  for (const id of createdRequestIds) await db.delete(trainingRequests).where(eq(trainingRequests.id, id));
  for (const id of createdProductIds) await db.delete(products).where(eq(products.id, id));
  for (const id of createdUserIds) await db.delete(users).where(eq(users.id, id));
  createdRequestIds.length = 0;
  createdProductIds.length = 0;
  createdUserIds.length = 0;
});

async function makeUser() {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, email: `admin-test-${id}@example.com`, passwordHash: 'x', fullName: 'Test Student' });
  createdUserIds.push(id);
  return id;
}

async function makeProduct() {
  const id = crypto.randomUUID();
  await db.insert(products).values({ id, type: 'mentoring', name: 'Personal Training', status: 'active' });
  createdProductIds.push(id);
  return id;
}

async function makeRequest(overrides: Partial<typeof trainingRequests.$inferInsert> = {}) {
  const userId = await makeUser();
  const productId = await makeProduct();
  const id = crypto.randomUUID();
  await db.insert(trainingRequests).values({
    id,
    userId,
    productId,
    contactName: 'Jane Student',
    contactEmail: 'jane@example.com',
    areaOfInterest: 'Cloud security',
    experienceLevel: 'beginner',
    goals: 'Learn cloud security.',
    status: 'new',
    ...overrides,
  });
  createdRequestIds.push(id);
  return id;
}

describe('isTrainingRequestStatus', () => {
  it('accepts every real status value and rejects anything else', () => {
    expect(isTrainingRequestStatus('new')).toBe(true);
    expect(isTrainingRequestStatus('converted')).toBe(true);
    expect(isTrainingRequestStatus('approved_typo')).toBe(false);
    expect(isTrainingRequestStatus('')).toBe(false);
  });
});

describe('listTrainingRequests / getTrainingRequest', () => {
  it('lists requests joined with the student\'s current name/email, optionally filtered by status', async () => {
    const id = await makeRequest({ status: 'reviewing' });
    const all = await listTrainingRequests();
    expect(all.some((r) => r.id === id)).toBe(true);

    const filtered = await listTrainingRequests({ status: 'reviewing' });
    expect(filtered.some((r) => r.id === id)).toBe(true);

    const wrongFilter = await listTrainingRequests({ status: 'declined' });
    expect(wrongFilter.some((r) => r.id === id)).toBe(false);
  });

  it('getTrainingRequest includes internalNotes (admin-only detail)', async () => {
    const id = await makeRequest({ internalNotes: 'Discussed pricing on a call.' });
    const row = await getTrainingRequest(id);
    expect(row?.internalNotes).toBe('Discussed pricing on a call.');
  });
});

describe('setTrainingRequestStatus', () => {
  it('updates the status normally', async () => {
    const id = await makeRequest({ status: 'new' });
    await setTrainingRequestStatus(id, 'reviewing');
    const row = await getTrainingRequest(id);
    expect(row?.status).toBe('reviewing');
  });

  it('refuses to move a converted request to any other status', async () => {
    const id = await makeRequest({ status: 'converted' });
    await expect(setTrainingRequestStatus(id, 'declined')).rejects.toThrow(/already been converted/i);
    const row = await getTrainingRequest(id);
    expect(row?.status).toBe('converted');
  });
});

describe('setTrainingRequestAgreedPrice', () => {
  it('records a positive amount and currency', async () => {
    const id = await makeRequest({ status: 'reviewing' });
    await setTrainingRequestAgreedPrice(id, 15000, 'usd');
    const row = await getTrainingRequest(id);
    expect(row?.agreedPriceAmount).toBe(15000);
    expect(row?.agreedCurrencyCode).toBe('USD');
  });

  it('rejects a zero or negative amount', async () => {
    const id = await makeRequest({ status: 'reviewing' });
    await expect(setTrainingRequestAgreedPrice(id, 0, 'USD')).rejects.toThrow();
    await expect(setTrainingRequestAgreedPrice(id, -500, 'USD')).rejects.toThrow();
  });

  it('refuses to change the price on an already-converted request', async () => {
    const id = await makeRequest({ status: 'converted', agreedPriceAmount: 10000, agreedCurrencyCode: 'USD' });
    await expect(setTrainingRequestAgreedPrice(id, 20000, 'USD')).rejects.toThrow(/already been converted/i);
  });
});

describe('setTrainingRequestInternalNotes', () => {
  it('saves notes, and an empty string clears them to null rather than storing blank text', async () => {
    const id = await makeRequest();
    await setTrainingRequestInternalNotes(id, 'Called, left voicemail.');
    expect((await getTrainingRequest(id))?.internalNotes).toBe('Called, left voicemail.');

    await setTrainingRequestInternalNotes(id, '');
    expect((await getTrainingRequest(id))?.internalNotes).toBeNull();
  });
});
