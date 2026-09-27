/**
 * Transactional email — no provider is chosen yet (docs/LMS_PRE_PHASE_2_REVIEW.md
 * §15, item 4: Resend/Postmark/SES, needed by Phase 7, not assumed here).
 * This dev transport logs to the server console so registration/reset flows
 * are fully testable locally without a real provider. Wiring a real
 * provider means replacing the body of this one function — nothing else
 * in the app should ever call an email API directly.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // Deliberately not a silent no-op in production: a missing email
    // provider should be loud, not a quietly-undelivered verification email.
    console.error(
      `[email] No transactional email provider configured — email to ${to} ("${subject}") was NOT sent. Configure a provider before going live.`,
    );
    return;
  }
  console.log(`[dev email] to=${to} subject="${subject}"\n${body}`);
}
