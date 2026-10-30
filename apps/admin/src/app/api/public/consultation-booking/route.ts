import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/auth/rateLimit';
import { bookPaidConsultation } from '@/lib/pricing/consultationBooking';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const bookingSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
  country: z.string().max(100).optional(),
  countryDetectionSource: z.string().max(20).optional(),
  industry: z.string().max(200).optional(),
  website: z.string().max(300).optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']).optional(),
  numberOfEmployees: z.string().max(50).optional(),
  securityConcern: z.string().max(5000).optional(),
  preferredPackageSlug: z.string().max(100).optional(),
  preferredDateTime: z.string().datetime(),
  timezone: z.string().max(100).optional(),
  additionalInformation: z.string().max(5000).optional(),
  displayedCurrency: z.string().length(3).optional(),
  // Honeypot — same convention as the Astro site's own forms
  // (BookingForm.astro's "website" field, ContactForm.astro's
  // equivalent): a real visitor never fills this in, a bot usually does.
  website_hp: z.string().max(0).optional(),
});

/**
 * Public, unauthenticated, cross-origin — the pricing page's booking
 * form on shahidiqbal.com calls this directly from the visitor's
 * browser (same reasoning as every other /api/public/* route in this
 * app). Creates a real lead + consultation + invoice + pending payment
 * — see bookPaidConsultation's own comment for why payment is always
 * 'pending' here, never marked paid.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`consultation-booking:ip:${ip}`, { maxAttempts: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: CORS_HEADERS });
  }

  const parsed = bookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }, { status: 400, headers: CORS_HEADERS });
  }
  if (parsed.data.website_hp) {
    // Honeypot tripped — pretend success so a bot doesn't learn to
    // leave the field empty, but never actually write a row.
    return NextResponse.json({ success: true, consultationId: 'ok' }, { headers: CORS_HEADERS });
  }

  const preferredDateTime = new Date(parsed.data.preferredDateTime);
  if (Number.isNaN(preferredDateTime.getTime())) {
    return NextResponse.json({ error: 'Invalid preferred date/time' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const result = await bookPaidConsultation({ ...parsed.data, preferredDateTime });
    return NextResponse.json({ success: true, ...result }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('[consultation-booking] failed:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again or email info@shahidiqbal.com.' }, { status: 500, headers: CORS_HEADERS });
  }
}
