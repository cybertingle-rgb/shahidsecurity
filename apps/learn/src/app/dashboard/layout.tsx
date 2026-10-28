import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { logoutAction } from './logout-action';
import PortalSidebar, { type PortalNavSection } from '@/components/PortalSidebar';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

const NAV_SECTIONS: PortalNavSection[] = [
  {
    label: 'Menu',
    items: [
      { href: '/dashboard', label: 'Overview', icon: 'home' },
      { href: '/courses', label: 'Browse Courses', icon: 'book-open' },
      { href: '/dashboard/courses', label: 'My Courses', icon: 'graduation-cap' },
      { href: '/dashboard/personal-training', label: 'Personal Training', icon: 'user-plus' },
      { href: '/dashboard/membership', label: 'Membership', icon: 'credit-card' },
      { href: '/dashboard/checkout', label: 'Buy', icon: 'shopping-cart' },
      { href: '/dashboard/community', label: 'Community', icon: 'users' },
      { href: '/dashboard/orders', label: 'Orders', icon: 'receipt' },
    ],
  },
  {
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: 'user' },
      { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
    ],
  },
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

  const sections: PortalNavSection[] = isAdmin
    ? [...NAV_SECTIONS, { items: [{ href: '/admin', label: 'Admin panel', icon: 'shield', accent: true }] }]
    : NAV_SECTIONS;

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="portal-bg-orbs" aria-hidden="true" />
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
        <PortalSidebar
          sections={sections}
          userName={user.fullName}
          userRole={isAdmin ? 'Admin' : 'Student'}
          profileHref="/dashboard/profile"
          logoutAction={logoutAction}
          storageKey="learn-dashboard-sidebar-collapsed"
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
