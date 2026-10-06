import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

// This entire application is a private administration panel — every
// page gets noindex both here and via next.config.mjs's headers()
// (belt-and-suspenders, since metadata and HTTP headers are read by
// slightly different consumers).
export const metadata: Metadata = {
  title: 'Shahid Security — Admin',
  description: 'Internal administration panel.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
