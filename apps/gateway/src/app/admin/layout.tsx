import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Preloader } from '@/admin-core/components/Preloader';
import MatrixCursor from '@/admin-core/components/MatrixCursor';
import { BASE_PATH } from '@/admin-core/lib/basePath';

// This entire application is a private administration panel — every
// page gets noindex both here and via next.config.mjs's headers()
// (belt-and-suspenders, since metadata and HTTP headers are read by
// slightly different consumers).
//
// No <html>/<body> here (platform consolidation — see app/layout.tsx):
// this is a nested layout now, not its own app's root layout, so it only
// adds the admin-specific chrome around {children}.
export const metadata: Metadata = {
  title: 'Shahid Security — Admin',
  description: 'Internal administration panel.',
  robots: { index: false, follow: false },
  icons: { icon: `${BASE_PATH}/icon.png`, apple: `${BASE_PATH}/apple-icon.png` },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen antialiased">
      <Preloader />
      <MatrixCursor />
      {children}
    </div>
  );
}
