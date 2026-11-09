import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/admin-core/db';
import { leads } from '@/admin-core/db/schema';
import { checkRateLimit } from '@/admin-core/lib/auth/rateLimit';
import { sendEmail } from '@/admin-core/lib/email';

/**
 * Replaces public/api/report-download.php, same reasoning and same
 * before/after split as src/app/api/contact.php/route.ts (see that
 * file's comment for the full story of why these .php URLs are real
 * Next.js routes now).
 *
 * One structural difference from the original PHP: that version minted
 * a random token and wrote a {slug, email, purpose, expiresAt} JSON file
 * to disk, which report-file.php then looked up. A Node.js standalone
 * deploy has no guarantee that disk survives between requests across a
 * redeploy (a new build gets a fresh directory), and this app has no
 * dedicated table for this low-volume, short-lived data either — so the
 * token here is self-contained and signed instead: payload + HMAC-SHA256
 * signature, verified in report-file.php/route.ts with no storage of any
 * kind. A `leads` row is still written (same as contact.php) so the
 * owner sees every request in the dashboard regardless of whether the
 * visitor ever actually uses the download link.
 */

export const ALLOWED_REPORTS: Record<string, { file: string; title: string }> = {
  'iot-smart-campus': {
    file: 'iot-smart-campus-thesis.pdf',
    title: 'Threats & Attacks on an IoT-Based Smart Campus System',
  },
};

const ALLOWED_PURPOSES = ['Recruiter / hiring review', 'Academic or research reference', 'Client due-diligence', 'Personal interest', 'Other'];

const TOKEN_TTL_SECONDS = 172800; // 48 hours

function signingKey(): Buffer {
  // Derived from ADMIN_SESSION_SECRET rather than reusing it directly —
  // a distinct sub-key per purpose means this token's signature can
  // never be confused with (or weaken) session-cookie signing.
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  return createHmac('sha256', secret).update('report-download-token:v1').digest();
}

export function mintReportToken(slug: string): string {
  const payload = JSON.stringify({ slug, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', signingKey()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyReportToken(token: string, expectedSlug: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return false;

  const expectedSignature = createHmac('sha256', signingKey()).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as { slug?: string; exp?: number };
    if (payload.slug !== expectedSlug) return false;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

function cleanField(value: FormDataEntryValue | null, maxLength: number): string {
  const str = typeof value === 'string' ? value : '';
  return str.trim().replace(/[\r\n]/g, '').slice(0, maxLength);
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  const allowed = await checkRateLimit(`report-download:ip:${ip}`, { maxAttempts: 8, windowMs: 10 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ success: false, message: 'Invalid submission.' }, { status: 400 });
  }

  const slug = cleanField(formData.get('slug'), 100);
  const report = ALLOWED_REPORTS[slug];
  if (!report) {
    return NextResponse.json({ success: false, message: 'Unknown report.' }, { status: 404 });
  }

  // Honeypot + minimum time-to-submit: a trip still returns a convincing
  // (but non-functional) download URL so bots aren't tipped off, same as
  // the PHP version.
  const honeypot = cleanField(formData.get('website'), 200);
  const ts = formData.get('ts');
  let isBot = honeypot !== '';
  if (!isBot && typeof ts === 'string' && /^\d+$/.test(ts)) {
    const elapsedMs = Date.now() - Number(ts);
    if (elapsedMs >= 0 && elapsedMs < 2000) isBot = true;
  }
  if (isBot) {
    return NextResponse.json({ success: true, downloadUrl: `/api/report-file.php?slug=${encodeURIComponent(slug)}&token=invalid` });
  }

  const fieldErrors: Record<string, string> = {};

  const emailRaw = cleanField(formData.get('email'), 254);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw);
  if (!emailValid) fieldErrors.email = 'Please enter a valid email address.';

  const purpose = cleanField(formData.get('purpose'), 100);
  if (!ALLOWED_PURPOSES.includes(purpose)) fieldErrors.purpose = 'Please select a purpose.';

  const detailsRaw = formData.get('details');
  const details = (typeof detailsRaw === 'string' ? detailsRaw : '').trim().slice(0, 2000);
  if (details.length < 5) fieldErrors.details = 'Please add a short note (at least a few words).';

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ success: false, message: 'Please fix the highlighted fields.', fieldErrors }, { status: 422 });
  }

  try {
    await db.insert(leads).values({
      id: crypto.randomUUID(),
      fullName: emailRaw,
      email: emailRaw,
      message: `Report download request: ${report.title} (${slug})\nPurpose: ${purpose}\n\n${details}`,
      source: 'report_download',
    });
  } catch (err) {
    console.error('[report-download.php] Failed to record lead:', err);
    return NextResponse.json({ success: false, message: 'Sorry, something went wrong on our end. Please email info@shahidiqbal.com instead.' }, { status: 500 });
  }

  try {
    await sendEmail(
      'info@shahidiqbal.com',
      `Report download: ${report.title}`,
      [`Report: ${report.title} (${slug})`, `Requester email: ${emailRaw}`, `Purpose: ${purpose}`, '', 'Details:', details].join('\n'),
    );
  } catch (err) {
    // Best-effort — the download must still work even if this fails.
    console.error('[report-download.php] Email send failed (non-fatal):', err);
  }

  const token = mintReportToken(slug);
  return NextResponse.json({ success: true, downloadUrl: `/api/report-file.php?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}` });
}
