import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Transactional email over the same Hostinger SMTP mailbox pattern
 * apps/learn already uses (see that app's src/lib/email.ts) — just this
 * app's own mailbox (info@shahidiqbal.com). Falls back to console
 * logging when SMTP_* isn't configured — local dev never needs real
 * credentials, and a misconfigured production deploy fails loud (an
 * error log) rather than silently dropping a password reset email.
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

export async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<void> {
  const transport = getTransporter();

  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[email] SMTP not configured — email to ${to} ("${subject}") was NOT sent. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD.`);
      return;
    }
    console.log(`[dev email] to=${to} subject="${subject}"\n${body}`);
    return;
  }

  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'Shahid Security Admin';
  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: body,
    ...(html ? { html } : {}),
  });
}

/** Table-based layout, every style inline — survives Gmail/Outlook's CSS stripping. Same template shape as apps/learn's authEmailHtml. */
export function authEmailHtml(opts: { heading: string; intro: string; buttonLabel: string; buttonUrl: string; footer?: string }): string {
  const { heading, intro, buttonLabel, buttonUrl, footer } = opts;
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#05070a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#0b0f14;border:1px solid #1a2a22;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <span style="display:inline-block;font-size:14px;font-weight:600;letter-spacing:0.04em;color:#00bf63;text-transform:uppercase;">Shahid Security Admin</span>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <h1 style="margin:0;font-size:22px;line-height:1.3;color:#e6f1ea;">${heading}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#8aa396;">${intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;text-align:center;">
                <a href="${buttonUrl}" style="display:inline-block;background-color:#00bf63;color:#05070a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">${buttonLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;text-align:center;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8aa396;">
                  If the button doesn't work, copy and paste this link into your browser:<br />
                  <a href="${buttonUrl}" style="color:#00bf63;word-break:break-all;">${buttonUrl}</a>
                </p>
              </td>
            </tr>
            ${footer ? `<tr><td style="padding:24px 32px 0 32px;text-align:center;"><p style="margin:0;font-size:12px;line-height:1.6;color:#8aa396;">${footer}</p></td></tr>` : ''}
            <tr>
              <td style="padding:28px 32px 32px 32px;text-align:center;border-top:1px solid #1a2a22;margin-top:24px;">
                <p style="margin:16px 0 0 0;font-size:12px;color:#8aa396;">Shahid Security — internal admin panel</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
