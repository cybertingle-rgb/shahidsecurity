import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Same reasoning as reset-password/layout.tsx — carries a single-use token.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
