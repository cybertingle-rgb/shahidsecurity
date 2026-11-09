import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/admin-core/db';
import { leads } from '@/admin-core/db/schema';
import { checkRateLimit } from '@/admin-core/lib/auth/rateLimit';
import { sendEmail } from '@/admin-core/lib/email';

/**
 * Replaces public/api/contact.php (a real PHP+PHPMailer script) after the
 * platform-consolidation merge moved shahidiqbal.com from PHP/Apache shared
 * hosting to this Node.js app. The static .php file is still copied into
 * astro-dist/ by the Astro build, but a Node.js host has no PHP runtime
 * behind it: that file was only ever served as a static asset from here on
 * (the catch-all route at src/app/[[...slug]]/route.ts, GET-only), which
 * means every POST from src/components/ContactForm.astro has been getting
 * a 405 Method Not Allowed since the merge — the contact form has been
 * silently broken, and the stale .php source was downloadable via a plain
 * GET to this URL. This exact-path route.ts takes precedence over that
 * catch-all for every method, fixing both: it defines POST (keeping the
 * form working with zero changes needed on the Astro side, same URL) and
 * leaves GET undefined, so Next.js itself returns 405 instead of the file
 * contents.
 *
 * Ported logic 1:1 from the PHP script: honeypot field, minimum
 * time-to-submit, per-IP rate limiting, the same allowed `service` values,
 * the same field validation and limits. Two deliberate differences from
 * the PHP version:
 * - The PHP version wrote directly to a leads row only as a best-effort
 *   side effect over HTTP to apps/admin (docs/LEADS_INTAKE.md) — now that
 *   this is the same process as the database, it inserts into `leads`
 *   directly, and that insert (not the email) is what determines success.
 * - The PHP version failed the whole request if SMTP sending failed.
 *   Flipped here: email is sent best-effort (same graceful-degradation
 *   pattern as every other optional integration in this app — see
 *   src/admin-core/lib/email.ts) so a visitor's enquiry is never lost
 *   just because SMTP_HOST/etc. aren't set in this environment yet.
 */

const ALLOWED_SERVICES = [
  'Penetration Testing',
  'Vulnerability Assessment',
  'Network & Cloud Security',
  'Compliance & Risk',
  'Incident Response (urgent)',
  'Monitoring & Training',
  'Website Development',
  'Software Development',
  'AI Automation',
  'Not sure',
];

const CONTACT_TO_EMAIL = 'info@shahidiqbal.com';

function cleanField(value: FormDataEntryValue | null, maxLength: number): string {
  const str = typeof value === 'string' ? value : '';
  return str.trim().replace(/[\r\n]/g, '').slice(0, maxLength);
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Not configured — skip, don't block submissions on a feature that isn't set up.
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    return data?.success === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  const allowed = await checkRateLimit(`contact-form:ip:${ip}`, { maxAttempts: 5, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ success: false, message: 'Invalid submission.' }, { status: 400 });
  }

  // Honeypot + minimum time-to-submit — both silently "succeed" so a bot
  // never learns it was caught.
  const honeypot = cleanField(formData.get('website'), 200);
  if (honeypot !== '') {
    return NextResponse.json({ success: true });
  }
  const ts = formData.get('ts');
  if (typeof ts === 'string' && /^\d+$/.test(ts)) {
    const elapsedMs = Date.now() - Number(ts);
    if (elapsedMs >= 0 && elapsedMs < 2500) {
      return NextResponse.json({ success: true });
    }
  }

  const turnstileToken = cleanField(formData.get('cf-turnstile-response'), 2000);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json({ success: false, message: 'We could not verify your submission. Please try again.' }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};

  const name = cleanField(formData.get('name'), 200);
  if (name === '') fieldErrors.name = 'Please enter your name.';

  const emailRaw = cleanField(formData.get('email'), 254);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw);
  if (!emailValid) fieldErrors.email = 'Please enter a valid email address.';

  const company = cleanField(formData.get('company'), 200);
  const phone = cleanField(formData.get('phone'), 50);

  let service = cleanField(formData.get('service'), 100);
  if (!ALLOWED_SERVICES.includes(service)) service = 'Not sure';

  const messageRaw = formData.get('message');
  const message = (typeof messageRaw === 'string' ? messageRaw : '').trim().slice(0, 5000);
  if (message === '') fieldErrors.message = 'Please enter a message.';

  const ndaRequested = formData.get('nda') === 'yes';

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ success: false, message: 'Please fix the highlighted fields.', fieldErrors }, { status: 422 });
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(leads).values({
      id,
      fullName: name,
      email: emailRaw,
      phone: phone || null,
      company: company || null,
      message,
      source: 'contact_form',
    });
  } catch (err) {
    console.error('[contact.php] Failed to record lead:', err);
    return NextResponse.json({ success: false, message: 'Sorry, something went wrong on our end. Please email info@shahidiqbal.com instead.' }, { status: 500 });
  }

  try {
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${emailRaw}`,
      `Company: ${company || '-'}`,
      `Phone: ${phone || '-'}`,
      `Service: ${service}`,
      `NDA requested: ${ndaRequested ? 'Yes' : 'No'}`,
      '',
      'Message:',
      message,
    ];
    await sendEmail(CONTACT_TO_EMAIL, `New enquiry: ${service}`, bodyLines.join('\n'));
    await sendEmail(
      emailRaw,
      'We received your message — Shahid Security',
      [
        `Hi ${name},`,
        '',
        "Thanks for reaching out to Shahid Security. We've received your message and reply within 24 hours on working days.",
        'For urgent incidents (active hack, ransomware), reply to this email and mark it urgent — we prioritize those.',
        '',
        '— Shahid Security',
      ].join('\n'),
    );
  } catch (err) {
    // Best-effort: the lead is already safely recorded above, so a mail
    // failure here never costs the visitor's enquiry.
    console.error('[contact.php] Email send failed (lead was still recorded):', err);
  }

  return NextResponse.json({ success: true });
}
