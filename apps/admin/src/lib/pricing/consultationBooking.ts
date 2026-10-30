import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { leads, consultations, customers, invoices, payments } from '@/db/schema';
import { nextInvoiceNumber } from '@/lib/payments';
import { getOrCreateBusinessSettings } from '@/lib/business';
import { sendEmail } from '@/lib/email';
import { getOrCreateConsultationSettings } from './plans';
import { convertFromUsd } from './fxRates';
import { FALLBACK_CURRENCY, formatCurrencyAmount } from './currency';

export type ConsultationBookingInput = {
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  country?: string;
  countryDetectionSource?: string;
  industry?: string;
  website?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  numberOfEmployees?: string;
  securityConcern?: string;
  preferredPackageSlug?: string;
  preferredDateTime: Date;
  timezone?: string;
  additionalInformation?: string;
  /** Whatever currency the visitor was actually shown on the pricing page when they booked — recorded, never silently changed later. */
  displayedCurrency?: string;
};

export type ConsultationBookingResult = {
  consultationId: string;
  invoiceNumber: string;
  feeUsd: number;
  displayedCurrency: string;
  displayedAmount: number;
};

/**
 * The owner's consultation model is explicitly PAID, and no live
 * payment gateway is configured in this app (src/lib/payments.ts's
 * paymentProviderStatus() — see docs/PRICING.md). This never claims a
 * payment was received: every booking lands as a 'pending' payment
 * against a real invoice, and only an admin marking it verified
 * (existing /dashboard/payments workflow) ever changes that. The
 * visitor is told plainly that the slot is confirmed once payment is
 * received, never before.
 *
 * Reuses the existing leads/consultations/customers/invoices/payments
 * tables end to end — no parallel booking or billing system.
 */
export async function bookPaidConsultation(input: ConsultationBookingInput): Promise<ConsultationBookingResult> {
  const settings = await getOrCreateConsultationSettings();
  const feeUsd = Number(settings.feeUsd);

  const displayedCurrency = input.displayedCurrency && input.displayedCurrency !== 'USD' ? input.displayedCurrency.toUpperCase() : FALLBACK_CURRENCY;
  const converted = await convertFromUsd(feeUsd, displayedCurrency);

  const existingCustomer = await db.select().from(customers).where(eq(customers.email, input.email)).limit(1);
  let customerId: string;
  if (existingCustomer[0]) {
    customerId = existingCustomer[0].id;
  } else {
    customerId = crypto.randomUUID();
    await db.insert(customers).values({
      id: customerId,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      company: input.companyName ?? null,
    });
  }

  const leadId = crypto.randomUUID();
  await db.insert(leads).values({
    id: leadId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    company: input.companyName ?? null,
    message: input.securityConcern ?? null,
    source: 'pricing_consultation_booking',
  });

  // The authoritative charge is always in USD (docs/PRICING.md §9: "Do
  // not silently change the currency at checkout" / "Confirm the actual
  // charge amount") — displayedCurrency/displayedAmount below are the
  // courtesy estimate the visitor actually saw, recorded for reference,
  // never what they're actually invoiced in.
  const invoiceId = crypto.randomUUID();
  const invoiceNumber = await nextInvoiceNumber();
  await db.insert(invoices).values({
    id: invoiceId,
    customerId,
    invoiceNumber,
    currency: 'USD',
    amountDue: feeUsd.toString(),
    status: 'sent',
  });

  const paymentId = crypto.randomUUID();
  await db.insert(payments).values({
    id: paymentId,
    invoiceId,
    customerId,
    provider: 'manual',
    amount: feeUsd.toString(),
    currency: 'USD',
    status: 'pending',
    metadata: { kind: 'consultation_fee', displayedCurrency, displayedAmount: converted.amount, fxRateTimestamp: converted.rateTimestamp },
  });

  const consultationId = crypto.randomUUID();
  await db.insert(consultations).values({
    id: consultationId,
    leadId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
    country: input.country ?? null,
    requestedAt: input.preferredDateTime,
    status: 'requested',
    companyName: input.companyName ?? null,
    industry: input.industry ?? null,
    website: input.website ?? null,
    companySize: input.companySize ?? null,
    numberOfEmployees: input.numberOfEmployees ?? null,
    securityConcern: input.securityConcern ?? null,
    preferredPackageSlug: input.preferredPackageSlug ?? null,
    timezone: input.timezone ?? null,
    additionalInformation: input.additionalInformation ?? null,
    feeUsd: feeUsd.toString(),
    displayedCurrency,
    displayedAmount: converted.amount.toString(),
    fxRateTimestamp: converted.rateTimestamp,
    countryDetectionSource: input.countryDetectionSource ?? null,
    invoiceId,
    paymentId,
    paymentStatus: 'pending',
  });

  await notifyNewConsultationBooking({ fullName: input.fullName, email: input.email, invoiceNumber, feeUsd, displayedCurrency, displayedAmount: converted.amount });

  return { consultationId, invoiceNumber, feeUsd, displayedCurrency, displayedAmount: converted.amount };
}

/**
 * Best-effort notification only — sendEmail already degrades to a
 * console log when SMTP isn't configured (src/lib/email.ts), and this
 * wraps the call so any other failure (a real SMTP error, a missing
 * business email) never fails the booking itself. The booking's real
 * record of truth is the database rows above, not this email.
 */
async function notifyNewConsultationBooking(details: {
  fullName: string;
  email: string;
  invoiceNumber: string;
  feeUsd: number;
  displayedCurrency: string;
  displayedAmount: number;
}): Promise<void> {
  try {
    const business = await getOrCreateBusinessSettings();
    const staffEmail = business.email || 'info@shahidiqbal.com';
    const amountLine =
      details.displayedCurrency === 'USD'
        ? formatCurrencyAmount(details.feeUsd, 'USD')
        : `${formatCurrencyAmount(details.feeUsd, 'USD')} (≈ ${formatCurrencyAmount(details.displayedAmount, details.displayedCurrency)})`;

    await sendEmail(
      staffEmail,
      `New paid consultation request — ${details.fullName}`,
      `${details.fullName} (${details.email}) requested a paid consultation.\n\nInvoice: ${details.invoiceNumber}\nFee: ${amountLine}\n\nReview and confirm payment in /dashboard/leads or /dashboard/payments once received.`,
    );

    await sendEmail(
      details.email,
      'Your Shahid Security consultation request',
      `Thanks for requesting a consultation with Shahid Security.\n\nConsultation fee: ${amountLine}\nInvoice: ${details.invoiceNumber}\n\nThis fee is for the consultation itself and is required to confirm your slot. We'll follow up by email with payment instructions — your appointment is pending until payment is received and verified; nothing is charged automatically.`,
    );
  } catch (err) {
    console.error('[consultationBooking] notification email failed (booking itself still succeeded):', err);
  }
}
