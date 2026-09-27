import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { logoutAction } from './logout-action';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/courses', label: 'My Courses' },
  { href: '/dashboard/membership', label: 'Membership' },
  { href: '/dashboard/community', label: 'Community' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/profile', label: 'Profile' },
  { href: '/dashboard/settings', label: 'Settings' },
];

/**
 * Route protection lives here (a Server Component layout) rather than in
 * middleware.ts: session validation needs a real MySQL query via the
 * mysql2 driver, which needs the Node.js runtime, not the Edge runtime
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
      <div className="flex flex-col gap-6 p-6 sm:flex-row">
        <nav className="flex shrink-0 gap-2 overflow-x-auto sm:w-48 sm:flex-col">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-text"
            >
              {item.label}
            </Link>
          ))}
          <form action={logoutAction} className="sm:mt-4">
            <button type="submit" className="w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-surface">
              Log out
            </button>
          </form>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
