import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';

/**
 * Route protection lives here (a Server Component layout) rather than in
 * middleware.ts: session validation needs a real Postgres query via the
 * `pg` driver, which needs the Node.js runtime, not the Edge runtime
 * middleware traditionally runs under. Every request to /dashboard/* re-hits
 * this check server-side — never inferred from client state
 * (docs/lms-security.md).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-6 py-4">
        <p className="text-sm text-text-muted">Learn with Shahid</p>
        <p className="text-lg font-semibold">Welcome, {user.fullName}</p>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
