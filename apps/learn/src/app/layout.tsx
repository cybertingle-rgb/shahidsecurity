import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import LunaWidget from '@/components/LunaWidget';

export const metadata: Metadata = {
  title: 'Learn with Shahid',
  description: 'The Learn with Shahid student and admin application.',
  // Belt-and-suspenders alongside the X-Robots-Tag header in next.config.mjs
  // — every indexable page for this product lives on the marketing site
  // (docs/lms-architecture.md §6).
  robots: { index: false, follow: false },
  icons: { icon: '/icon.png' },
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
