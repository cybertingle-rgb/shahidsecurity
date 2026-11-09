import type { ReactNode } from 'react';
import './globals.css';

// Platform consolidation (docs/consolidation/UNIFIED_ARCHITECTURE.md): this
// is the ONE root layout for the whole app now that apps/admin and
// apps/learn have been merged in as app/admin/* and app/learn/* route
// segments instead of separately-deployed Next.js apps proxied to over
// HTTP. Next.js allows exactly one <html>/<body> pair per render tree, so
// it has to live here, not in app/admin/layout.tsx or app/learn/layout.tsx
// (those are nested layouts now — they add their own chrome around
// {children} without re-declaring html/body). The shared globals.css
// (merged from the near-identical apps/admin and apps/learn copies — same
// @theme tokens, apps/learn's had a few extra component classes apps/admin
// never used) is imported once, here, for the same reason.
//
// Still structurally inert for the Astro site's own traffic: every GET to
// a path outside /admin and /learn is served by the catch-all Route
// Handler (src/app/[[...slug]]/route.ts), which returns the Astro build's
// static HTML directly — Route Handlers don't render through layouts at
// all, so this file never wraps that content.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
