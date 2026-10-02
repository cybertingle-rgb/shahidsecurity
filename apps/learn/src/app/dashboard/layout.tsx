import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { logoutAction } from './logout-action';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/courses', label: 'My Courses' },
  { href: '/dashboard/membership', label: 'Membership' },
  { href: '/dashboard/checkout', label: 'Buy' },
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

  const roleNames = await getUserRoleNames(user.id);
  const isAdmin = [...roleNames].some((name) => ADMIN_ROLE_NAMES.has(name));

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="portal-header sticky top-0 z-10 flex flex-col items-center gap-2 px-6 py-5">
        <Link href="/">
          <Image src="/logo.png" alt="Shahid Security" width={100} height={100} className="drop-shadow-[0_0_20px_rgba(0,191,99,0.45)]" priority />
        </Link>
        <div className="text-center">
          <p className="text-sm text-text-muted">Learn with Shahid</p>
          <p className="text-lg font-semibold">Welcome, {user.fullName}</p>
        </div>
      </header>
      <div className="flex flex-col gap-6 p-6 sm:flex-row">
        <nav className="portal-nav-panel flex shrink-0 gap-1 overflow-x-auto p-3 sm:w-52 sm:flex-col">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="whitespace-nowrap px-3 py-2 text-sm text-text-muted hover:text-text">
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="whitespace-nowrap px-3 py-2 text-sm font-medium text-neon">
              Admin panel →
            </Link>
          )}
          <form action={logoutAction} className="sm:mt-4">
            <button type="submit" className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
              Log out
            </button>
          </form>
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
