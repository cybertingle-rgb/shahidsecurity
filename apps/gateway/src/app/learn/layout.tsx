import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import LunaWidget from '@/learn-core/components/LunaWidget';
import MatrixCursor from '@/learn-core/components/MatrixCursor';
import { Preloader } from '@/learn-core/components/Preloader';
import { env } from '@/learn-core/lib/env';
import { BASE_PATH } from '@/learn-core/lib/basePath';

// Revision (2026-10): the public homepage, course catalog, and course
// detail pages live in this app now, not the Astro marketing site — this
// default metadata (and the default-indexable robots posture) applies to
// every page unless overridden. /dashboard and /admin each export their
// own `metadata` with an explicit noindex (and carry the matching
// X-Robots-Tag header from next.config.mjs as a second layer), since
// those are genuinely private, authenticated areas.
//
// No <html>/<body> here (platform consolidation — see app/layout.tsx):
// this is a nested layout now, not its own app's root layout, so it only
// adds the learn-specific chrome around {children}. icons/openGraph.images
// now need the explicit /learn prefix — this app never had a working
// basePath config to begin with (confirmed: the pre-merge version of this
// file used a bare '/icon.png', so learn.shahidiqbal.com's favicon was
// already broken before the merge; fixed here instead of carried over).
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Learn with Shahid', template: '%s | Learn with Shahid' },
  description: 'Learn cybersecurity through structured, instructor-built courses — practical exercises and expert-guided learning from a working security consultant.',
  icons: { icon: `${BASE_PATH}/icon.png` },
  openGraph: {
    siteName: 'Learn with Shahid',
    type: 'website',
    images: [{ url: `${BASE_PATH}/logo.png` }],
  },
  twitter: {
    card: 'summary',
  },
};

export default function LearnLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Preloader />
      <MatrixCursor />
      {children}
      <LunaWidget />
    </>
  );
}
