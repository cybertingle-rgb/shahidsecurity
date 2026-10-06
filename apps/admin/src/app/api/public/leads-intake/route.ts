import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { leads, consultations } from '@/db/schema';
import { checkRateLimit } from '@/lib/auth/rateLimit';

/**
 * Secret-gated intake endpoint for the real lead/consultation forms on
 * shahidiqbal.com (public/api/contact.php and public/api/book.php),
 * which have no server-side database access of their own (static
 * Astro + PHP mail scripts on Hostinger shared hosting). Those scripts
 * call this best-effort, AFTER already sending the real email — a
 * failure or unreachability here must never block or fail the visitor-
 * facing contact/booking flow, which is why the PHP side wraps the call
 * in a short timeout and swallows errors. See docs/LEADS_INTAKE.md.
 *
 * This never creates fake leads: every row here is only ever written in
 * direct response to a real visitor's real form submission.
 */
const leadSchema = z.object({
  type: z.literal('lead'),
  fullName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  source: z.string().max(100).optional(),
});

const consultationSchema = z.object({
  type: z.literal('consultation'),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  requestedAt: z.string().datetime(),
  source: z.string().max(100).optional(),
});

const bodySchema = z.discriminatedUnion('type', [leadSchema, consultationSchema]);

export async function POST(request: NextRequest) {
  const secret = process.env.LEADS_INTAKE_SECRET;
  const provided = request.headers.get('x-leads-intake-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const allowed = await checkRateLimit(`leads-intake:ip:${ip}`, { maxAttempts: 30, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (parsed.data.type === 'lead') {
    const { fullName, email, phone, company, message, source } = parsed.data;
    const id = crypto.randomUUID();
    await db.insert(leads).values({ id, fullName, email, phone, company, message, source: source ?? 'contact_form' });
    return NextResponse.json({ success: true, id });
  }

  const { fullName, phone, country, requestedAt, source } = parsed.data;
  const leadId = crypto.randomUUID();
  // email is genuinely null here, not a fabricated placeholder — the
  // booking form never collects one (see consultations' schema comment).
  await db.insert(leads).values({
    id: leadId,
    fullName,
    phone,
    source: source ?? 'booking_form',
  });
  const consultationId = crypto.randomUUID();
  await db.insert(consultations).values({
    id: consultationId,
    leadId,
    fullName,
    phone,
    country,
    requestedAt: new Date(requestedAt),
  });
  return NextResponse.json({ success: true, id: consultationId });
}
