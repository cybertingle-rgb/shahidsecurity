import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import LunaWidget from '@/components/LunaWidget';
import { env } from '@/lib/env';

// Revision (2026-10): the public homepage, course catalog, and course
// detail pages live in this app now, not the Astro marketing site — this
// default metadata (and the default-indexable robots posture) applies to
// every page unless overridden. /dashboard and /admin each export their
// own `metadata` with an explicit noindex (and carry the matching
// X-Robots-Tag header from next.config.mjs as a second layer), since
// those are genuinely private, authenticated areas.
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Learn with Shahid', template: '%s | Learn with Shahid' },
  description: 'Learn cybersecurity through structured, instructor-built courses — practical exercises and expert-guided learning from a working security consultant.',
  icons: { icon: '/icon.png' },
  openGraph: {
    siteName: 'Learn with Shahid',
    type: 'website',
    images: [{ url: '/logo.png' }],
  },
  twitter: {
    card: 'summary',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LunaWidget />
      </body>
    </html>
  );
}
