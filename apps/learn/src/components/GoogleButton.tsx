const ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: 'Google sign-in is not set up yet.',
  google_denied: 'Google sign-in was cancelled.',
  oauth_state: 'That sign-in link expired. Please try again.',
  google_email_unverified: 'That Google account’s email is not verified.',
  account_suspended: 'This account is suspended.',
  account_not_found: 'Something went wrong. Please try again.',
  too_many_attempts: 'Too many attempts. Try again later.',
  google_error: 'Google sign-in failed. Please try again.',
  google_token_exchange_failed: 'Google sign-in failed (token exchange). Please try again.',
  google_profile_fetch_failed: 'Google sign-in failed (profile fetch). Please try again.',
  google_account_error: 'Google sign-in failed (account setup). Please try again.',
  google_session_error: 'Google sign-in failed (session). Please try again.',
};

export function googleOAuthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return ERROR_MESSAGES[code] ?? 'Google sign-in failed. Please try again.';
}

export default function GoogleButton() {
  return (
    <a
      href="/api/auth/google"
      className="flex w-full items-center justify-center gap-2 rounded-md border border-border-strong bg-bg-elevated/60 px-4 py-2 font-medium text-text backdrop-blur-sm transition hover:border-neon"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.09-1.8 2.73v2.27h2.91c1.7-1.57 2.69-3.88 2.69-6.64z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.27c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z" />
        <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.99-2.34z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.99 2.34C4.66 5.16 6.65 3.58 9 3.58z" />
      </svg>
      Continue with Google
    </a>
  );
}
