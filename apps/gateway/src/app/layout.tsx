import type { ReactNode } from 'react';

// Required by the App Router, but never actually rendered for real
// traffic: every GET request is served by the catch-all route handler
// (src/app/[[...slug]]/route.ts), which returns the Astro site's own
// static HTML directly and never reaches React rendering. This only
// exists so the app directory is structurally valid.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
