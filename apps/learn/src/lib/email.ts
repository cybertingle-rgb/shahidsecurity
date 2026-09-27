import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Transactional email over the same Hostinger SMTP mailbox pattern the
 * main site's contact form uses (see php/config-template's SMTP_* block),
 * just for this app's own mailbox. Falls back to console logging when
 * SMTP_* isn't configured — local dev never needs real credentials, and a
 * misconfigured production deploy fails loud (an error log) rather than
 * silently dropping verification/reset emails. Nothing else in the app
 * should ever call an email API directly — replace this function's body
 * to change providers.
 */
let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    transporter = null;
    return transporter;
  }

  const port = Number(SMTP_PORT);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      // Deliberately not a silent no-op in production: a missing email
      // provider should be loud, not a quietly-undelivered verification email.
      console.error(`[email] SMTP not configured — email to ${to} ("${subject}") was NOT sent. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD.`);
      return;
    }
    console.log(`[dev email] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'Learn with Shahid';
  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: body,
  });
}
