import { eq, desc } from 'drizzle-orm';
import { learnDb as db, learnSchema } from '@/db/learnDb';

const { trainingRequests, users } = learnSchema;

export type TrainingRequestStatus = 'new' | 'reviewing' | 'contacted' | 'approved' | 'declined' | 'converted';

const STATUS_VALUES: TrainingRequestStatus[] = ['new', 'reviewing', 'contacted', 'approved', 'declined', 'converted'];

export function isTrainingRequestStatus(value: string): value is TrainingRequestStatus {
  return (STATUS_VALUES as string[]).includes(value);
}

/**
 * List view for the admin Personal Training queue — joins the
 * requester's current name/email from `users` (not the request's own
 * contactName/contactEmail snapshot) so the admin always sees who the
 * account actually belongs to today, even if the student later changes
 * their profile. `internalNotes` is deliberately left out of this list
 * query (full detail only, via getTrainingRequest) — nothing here forces
 * that, but keeping the list query's own shape narrow means a future
 * change to this function can't accidentally start returning it to a
 * context that wasn't reviewed for that.
 */
export async function listTrainingRequests(filter?: { status?: TrainingRequestStatus }) {
  const where = filter?.status ? eq(trainingRequests.status, filter.status) : undefined;
  return db
    .select({
      id: trainingRequests.id,
      areaOfInterest: trainingRequests.areaOfInterest,
      experienceLevel: trainingRequests.experienceLevel,
      status: trainingRequests.status,
      agreedPriceAmount: trainingRequests.agreedPriceAmount,
      agreedCurrencyCode: trainingRequests.agreedCurrencyCode,
      createdAt: trainingRequests.createdAt,
      studentName: users.fullName,
      studentEmail: users.email,
    })
    .from(trainingRequests)
    .innerJoin(users, eq(trainingRequests.userId, users.id))
    .where(where)
    .orderBy(desc(trainingRequests.createdAt));
}

/** Full detail, including internalNotes — admin-eyes-only, never exposed to a student-facing query. */
export async function getTrainingRequest(id: string) {
  const [row] = await db
    .select({
      id: trainingRequests.id,
      userId: trainingRequests.userId,
      productId: trainingRequests.productId,
      contactName: trainingRequests.contactName,
      contactEmail: trainingRequests.contactEmail,
      areaOfInterest: trainingRequests.areaOfInterest,
      experienceLevel: trainingRequests.experienceLevel,
      goals: trainingRequests.goals,
      specialRequest: trainingRequests.specialRequest,
      formatPreference: trainingRequests.formatPreference,
      preferredAvailability: trainingRequests.preferredAvailability,
      status: trainingRequests.status,
      internalNotes: trainingRequests.internalNotes,
      agreedPriceAmount: trainingRequests.agreedPriceAmount,
      agreedCurrencyCode: trainingRequests.agreedCurrencyCode,
      convertedOrderId: trainingRequests.convertedOrderId,
      createdAt: trainingRequests.createdAt,
      updatedAt: trainingRequests.updatedAt,
      studentName: users.fullName,
      studentEmail: users.email,
    })
    .from(trainingRequests)
    .innerJoin(users, eq(trainingRequests.userId, users.id))
    .where(eq(trainingRequests.id, id));
  return row ?? null;
}

/**
 * The status workflow is a plain admin-set value, not a strict state
 * machine with forbidden transitions — matching how `courses.status`
 * and `orders.status` already work elsewhere in this codebase (set
 * directly, not gated by a transition table) — except for one real
 * guard: a request that has already converted to a real order can never
 * be moved to any other status, since that would desynchronize the
 * audit trail from the actual money that already moved.
 */
export async function setTrainingRequestStatus(id: string, status: TrainingRequestStatus) {
  const existing = await getTrainingRequest(id);
  if (!existing) throw new Error('Request not found.');
  if (existing.status === 'converted' && status !== 'converted') {
    throw new Error('This request has already been converted to a booking and its status can no longer be changed.');
  }
  await db.update(trainingRequests).set({ status, updatedAt: new Date() }).where(eq(trainingRequests.id, id));
}

/** Admin-only internal notes — never read by any student-facing query (see getMyTrainingRequest in apps/learn). */
export async function setTrainingRequestInternalNotes(id: string, internalNotes: string) {
  await db.update(trainingRequests).set({ internalNotes: internalNotes || null, updatedAt: new Date() }).where(eq(trainingRequests.id, id));
}

/**
 * Records the price Shahid and the student actually agreed on after
 * discussing scope/availability — this alone never charges anything and
 * never creates an order; it only makes an offer visible on the
 * student's own request page, where they still have to explicitly
 * accept it (acceptTrainingRequestOffer, apps/learn/src/lib/
 * personalTraining.ts) before any payment record exists. Refuses to
 * touch a request that has already converted, same reasoning as
 * setTrainingRequestStatus above.
 */
export async function setTrainingRequestAgreedPrice(id: string, amountMinorUnits: number, currencyCode: string) {
  if (!Number.isFinite(amountMinorUnits) || amountMinorUnits <= 0) {
    throw new Error('Enter a positive price.');
  }
  const code = currencyCode.trim().toUpperCase();
  if (code.length !== 3) throw new Error('Enter a valid 3-letter currency code.');

  const existing = await getTrainingRequest(id);
  if (!existing) throw new Error('Request not found.');
  if (existing.status === 'converted') {
    throw new Error('This request has already been converted to a booking — the agreed price can no longer be changed here.');
  }

  await db
    .update(trainingRequests)
    .set({ agreedPriceAmount: Math.round(amountMinorUnits), agreedCurrencyCode: code, updatedAt: new Date() })
    .where(eq(trainingRequests.id, id));
}
