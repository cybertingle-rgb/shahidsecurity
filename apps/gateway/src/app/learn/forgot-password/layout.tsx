import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// No unique, search-worthy content — a forgot-password form has
// nothing for a search result to usefully show, same reasoning as
// reset-password/verify-email's existing noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
