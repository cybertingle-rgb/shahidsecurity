import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Preloader } from '@/components/Preloader';
import MatrixCursor from '@/components/MatrixCursor';
import { BASE_PATH } from '@/lib/basePath';

// This entire application is a private administration panel — every
// page gets noindex both here and via next.config.mjs's headers()
// (belt-and-suspenders, since metadata and HTTP headers are read by
// slightly different consumers).
export const metadata: Metadata = {
  title: 'Shahid Security — Admin',
  description: 'Internal administration panel.',
  robots: { index: false, follow: false },
  icons: { icon: `${BASE_PATH}/icon.png`, apple: `${BASE_PATH}/apple-icon.png` },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Preloader />
        <MatrixCursor />
        {children}
      </body>
    </html>
  );
}
