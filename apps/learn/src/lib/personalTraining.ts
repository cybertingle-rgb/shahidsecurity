import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/db';
import { products, trainingRequests, orders, payments, manualPaymentSubmissions, paymentMethods } from '@/db/schema';
import { generateOrderNumber } from './checkout';

export const PERSONAL_TRAINING_PRODUCT_NAME = 'Personal Training';

/**
 * Finds or creates the one real "Personal Training" product row —
 * deliberately created with NO row in `prices` at all, ever. That
 * absence (not a $0 amount, not a placeholder, not a borrowed course
 * price) is how this codebase already represents "free" vs. "not yet
 * priced": a $0 course still gets a real price row (lib/learn/courses.ts
 * — a free course goes through the same order/payment workflow a paid
 * one does); Personal Training instead has none, so `getPurchasableProduct`
 * (checkout.ts) can never resolve a price for it and the ordinary
 * self-checkout path can never be reached for this product — the exact
 * guarantee that it can't accidentally be bought like a priced course.
 * `courseId` stays null: this isn't prerecorded course content, it's an
 * instructor-led service, same distinction `type: 'mentoring'` already
 * exists in the products enum to express.
 *
 * Idempotent and self-healing like ensureDefaultInstructor
 * (apps/admin/src/lib/learn/courses.ts) — safe to call from any page
 * that needs this row to exist, with no separate manual admin setup
 * step required before the feature works.
 */
export async function ensurePersonalTrainingProduct() {
  const [existing] = await db.select().from(products).where(and(eq(products.type, 'mentoring'), eq(products.name, PERSONAL_TRAINING_PRODUCT_NAME)));
  if (existing) return existing;

  // The check above and this insert aren't transactional, and there's no
  // unique constraint on (type, name) to let the DB itself reject a
  // concurrent duplicate (only products_course_id_idx on courseId
  // exists) — so two requests racing on a cold DB (e.g. the homepage
  // render and Next's automatic prefetch of the /personal-training link
  // it renders, both firing on the very first visit) could both pass
  // `if (existing) return existing` and both try to insert. Re-checking
  // for an existing row before giving up turns that into "the loser
  // harmlessly throws away its own insert", not a visible crash or a
  // duplicate product silently left behind.
  const id = crypto.randomUUID();
  try {
    await db.insert(products).values({
      id,
      type: 'mentoring',
      name: PERSONAL_TRAINING_PRODUCT_NAME,
      description: 'Instructor-led training arranged around your own goals, skill level, and schedule — not a prerecorded course. Pricing and scheduling are discussed and agreed with you before anything is booked.',
      status: 'active',
      courseId: null,
    });
  } catch (err) {
    const [raceWinner] = await db.select().from(products).where(and(eq(products.type, 'mentoring'), eq(products.name, PERSONAL_TRAINING_PRODUCT_NAME)));
    if (raceWinner) return raceWinner;
    throw err;
  }
  const [created] = await db.select().from(products).where(eq(products.id, id));
  if (!created) throw new Error('Failed to create the Personal Training product.');
  return created;
}

export type TrainingRequestInput = {
  contactName: string;
  contactEmail: string;
  areaOfInterest: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  goals: string;
  specialRequest?: string;
  formatPreference?: 'one_on_one' | 'group' | 'no_preference';
  preferredAvailability?: string;
};

/**
 * Submits a request to discuss Personal Training — never a purchase.
 * No order, no payment, no price of any kind is created here; the
 * student is only ever asked to pay once an admin has set an agreed
 * price AND the student has explicitly accepted it (see
 * acceptTrainingRequestOffer below). Server-side validation of every
 * field, independent of whatever the client-side form already checked.
 */
export async function submitTrainingRequest(userId: string, input: TrainingRequestInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const contactName = input.contactName.trim();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  const areaOfInterest = input.areaOfInterest.trim();
  const goals = input.goals.trim();

  if (!contactName) return { ok: false, error: 'Your name is required.' };
  if (!contactEmail || !contactEmail.includes('@')) return { ok: false, error: 'A valid email is required.' };
  if (!areaOfInterest) return { ok: false, error: 'Tell us what area you want training in.' };
  if (!goals) return { ok: false, error: 'Tell us a bit about your goals.' };
  if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(input.experienceLevel)) {
    return { ok: false, error: 'Select a valid experience level.' };
  }

  const product = await ensurePersonalTrainingProduct();
  const id = crypto.randomUUID();

  await db.insert(trainingRequests).values({
    id,
    userId,
    productId: product.id,
    contactName,
    contactEmail,
    areaOfInterest,
    experienceLevel: input.experienceLevel,
    goals,
    specialRequest: input.specialRequest?.trim() || null,
    formatPreference: input.formatPreference ?? 'no_preference',
    preferredAvailability: input.preferredAvailability?.trim() || null,
    status: 'new',
  });

  return { ok: true, id };
}

/** A student's own requests, newest first — never another student's. */
export async function listMyTrainingRequests(userId: string) {
  return db
    .select({
      id: trainingRequests.id,
      areaOfInterest: trainingRequests.areaOfInterest,
      status: trainingRequests.status,
      agreedPriceAmount: trainingRequests.agreedPriceAmount,
      agreedCurrencyCode: trainingRequests.agreedCurrencyCode,
      convertedOrderId: trainingRequests.convertedOrderId,
      createdAt: trainingRequests.createdAt,
    })
    .from(trainingRequests)
    .where(eq(trainingRequests.userId, userId))
    .orderBy(desc(trainingRequests.createdAt));
}

/**
 * A single request, scoped to its owner — the IDOR guard every
 * student-facing lookup here needs (same pattern as
 * tests/student-idor.test.ts covers for courses/lessons). Never selects
 * `internalNotes`: that column exists for admin eyes only and this is
 * the one function a student-facing page calls, so leaving it out here
 * is what keeps it out of any response a student could read.
 */
export async function getMyTrainingRequest(userId: string, requestId: string) {
  const [row] = await db
    .select({
      id: trainingRequests.id,
      contactName: trainingRequests.contactName,
      contactEmail: trainingRequests.contactEmail,
      areaOfInterest: trainingRequests.areaOfInterest,
      experienceLevel: trainingRequests.experienceLevel,
      goals: trainingRequests.goals,
      specialRequest: trainingRequests.specialRequest,
      formatPreference: trainingRequests.formatPreference,
      preferredAvailability: trainingRequests.preferredAvailability,
      status: trainingRequests.status,
      agreedPriceAmount: trainingRequests.agreedPriceAmount,
      agreedCurrencyCode: trainingRequests.agreedCurrencyCode,
      convertedOrderId: trainingRequests.convertedOrderId,
      productId: trainingRequests.productId,
      createdAt: trainingRequests.createdAt,
    })
    .from(trainingRequests)
    .where(and(eq(trainingRequests.id, requestId), eq(trainingRequests.userId, userId)));
  return row ?? null;
}

/**
 * The one and only path from a training request to real money changing
 * hands — reached only after an admin has set an agreed price on an
 * `approved` request AND the student lands here and explicitly submits
 * payment proof against exactly that amount. Mirrors
 * checkout.ts's submitManualPayment (same order/payment/
 * manual_payment_submissions chain, same pending_verification-only-ever
 * result, same admin-approval-required-to-grant-access rule), but
 * resolves the charged amount from the request's server-stored
 * agreedPriceAmount rather than a catalog price — there is deliberately
 * no catalog price for this product to resolve (see
 * ensurePersonalTrainingProduct).
 */
export async function acceptTrainingRequestOffer(
  userId: string,
  requestId: string,
  paymentMethodId: string,
  details: { transactionReference: string; amountClaimed: number; paymentDate: Date; receiptFileUrl?: string | null },
): Promise<{ ok: true; orderNumber: string } | { ok: false; error: string }> {
  const request = await getMyTrainingRequest(userId, requestId);
  if (!request) return { ok: false, error: 'Request not found.' };
  if (request.status !== 'approved') return { ok: false, error: 'This request does not have an offer ready to accept yet.' };
  if (request.convertedOrderId) return { ok: false, error: 'This request has already been accepted.' };
  if (!request.agreedPriceAmount || !request.agreedCurrencyCode) {
    return { ok: false, error: 'No price has been agreed on this request yet.' };
  }

  const [method] = await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, paymentMethodId), eq(paymentMethods.isActive, true)));
  if (!method) return { ok: false, error: 'That payment method is not available.' };

  if (!details.transactionReference.trim()) return { ok: false, error: 'A transaction reference is required.' };
  if (!Number.isFinite(details.amountClaimed) || details.amountClaimed < 0) return { ok: false, error: 'Enter a valid amount.' };
  if (Number.isNaN(details.paymentDate.getTime())) return { ok: false, error: 'Enter a valid payment date.' };

  const orderId = crypto.randomUUID();
  const orderNumber = generateOrderNumber();
  await db.insert(orders).values({
    id: orderId,
    orderNumber,
    userId,
    productId: request.productId,
    amount: request.agreedPriceAmount,
    currencyCode: request.agreedCurrencyCode,
    status: 'pending',
  });

  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    orderId,
    provider: method.type,
    amount: request.agreedPriceAmount,
    currencyCode: request.agreedCurrencyCode,
    method: 'manual',
    paymentMethodId: method.id,
    status: 'pending_verification',
    idempotencyKey: crypto.randomUUID(),
  });

  await db.insert(manualPaymentSubmissions).values({
    id: crypto.randomUUID(),
    paymentId,
    transactionReference: details.transactionReference.trim(),
    amountClaimed: details.amountClaimed,
    paymentDate: details.paymentDate,
    receiptFileUrl: details.receiptFileUrl?.trim() || null,
    status: 'pending',
  });

  // Marks this request as converted immediately (not left for the later
  // payment-approval step) — convertedOrderId existing at all is what
  // acceptTrainingRequestOffer's own re-entrancy check above uses to
  // refuse a second accept attempt on the same request, independent of
  // whether that order has been verified yet.
  await db.update(trainingRequests).set({ status: 'converted', convertedOrderId: orderId, updatedAt: new Date() }).where(eq(trainingRequests.id, requestId));

  return { ok: true, orderNumber };
}
