import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { logoutAction } from '@/app/dashboard/logout-action';
import PortalSidebar, { type PortalNavSection } from '@/components/PortalSidebar';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

const NAV_SECTIONS: PortalNavSection[] = [
  {
    label: 'Menu',
    items: [
      { href: '/admin', label: 'Overview', icon: 'home' },
      { href: '/admin/students', label: 'Students', icon: 'users' },
      { href: '/admin/courses', label: 'Courses', icon: 'book-open' },
      { href: '/admin/products', label: 'Products & Pricing', icon: 'tag' },
      { href: '/admin/enrollments', label: 'Enrollments', icon: 'user-plus' },
      { href: '/admin/orders', label: 'Orders', icon: 'receipt' },
      { href: '/admin/payments', label: 'Payments', icon: 'credit-card' },
      { href: '/admin/communities', label: 'Communities', icon: 'users' },
      { href: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
    ],
  },
  {
    items: [
      { href: '/admin/payment-methods', label: 'Payment Methods', icon: 'wallet' },
      { href: '/admin/exchange-rates', label: 'Exchange Rates', icon: 'trending-up' },
      { href: '/admin/roadmap', label: 'Roadmap', icon: 'map' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings' },
    ],
  },
  {
    items: [{ href: '/dashboard', label: 'Student dashboard', icon: 'graduation-cap', accent: true }],
  },
];

// admin.shahidiqbal.com is a separate Next.js app with its own login —
// this switches the browser to its dashboard, it cannot carry this
// session over (different subdomain, different session cookie).
const SHAHID_ADMIN_URL = 'https://admin.shahidiqbal.com/dashboard';

/**
 * Switches between this app's admin and apps/admin's dashboard — two
 * separate Next.js apps on separate subdomains with separate session
 * cookies, so this is a navigation convenience, not single sign-on: the
 * other side still needs its own login if that session has expired.
 */
function AppSwitcher() {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      <a href={SHAHID_ADMIN_URL} className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text">
        <Image src="/brand/logo-stacked-dark-bg-sm.png" alt="" width={320} height={502} className="h-5 w-auto" />
        Shahid Admin
      </a>
      <span className="flex items-center gap-2 rounded-full bg-neon px-3 py-1.5 text-xs font-medium text-bg">
        <Image src="/learn-logo.png" alt="" width={1254} height={1254} className="h-5 w-auto" />
        Learn Admin
      </span>
    </div>
  );
}

/**
 * A logged-in non-admin gets a 404, not a 403 — deliberately doesn't
 * confirm that an admin panel exists at this path to an account that
 * isn't one, mirroring the register/login routes' "don't leak account
 * state" reasoning. RBAC is re-checked from the database on every request
 * (docs/lms-security.md); never inferred from a client-side flag.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const roleNames = await getUserRoleNames(user.id);
  const isAdmin = [...roleNames].some((name) => ADMIN_ROLE_NAMES.has(name));
  if (!isAdmin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="portal-bg-orbs" aria-hidden="true" />
      <header className="portal-header relative sticky top-0 z-10 flex flex-col items-center gap-2 px-6 py-5">
        <div className="absolute right-6 top-5">
          <AppSwitcher />
        </div>
        <Link href="/">
          <Image src="/logo.png" alt="Shahid Security" width={100} height={100} className="drop-shadow-[0_0_20px_rgba(0,191,99,0.45)]" priority />
        </Link>
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-neon">Learn with Shahid — Admin</p>
          <p className="text-lg font-semibold">{user.fullName}</p>
        </div>
      </header>
      <div className="flex flex-col gap-6 p-6 sm:flex-row">
        <PortalSidebar
          sections={NAV_SECTIONS}
          userName={user.fullName}
          userRole={roleNames.has('super_admin') ? 'Super Admin' : 'Admin'}
          logoutAction={logoutAction}
          storageKey="learn-admin-sidebar-collapsed"
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
