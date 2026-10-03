import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Carries a single-use token in its own query string — never worth
// indexing, and a stale cached URL with a real (even if expired) token
// shouldn't be sitting in search results either.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
