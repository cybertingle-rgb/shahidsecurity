import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';

const NAV_SECTIONS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/business', label: 'Business' },
  { href: '/dashboard/content', label: 'Content' },
  { href: '/dashboard/seo', label: 'SEO' },
  { href: '/dashboard/leads', label: 'Customers & Leads' },
  { href: '/dashboard/payments', label: 'Payments' },
  { href: '/dashboard/testimonials', label: 'Reviews' },
  { href: '/dashboard/google', label: 'Google' },
  { href: '/dashboard/ai', label: 'AI Assistant' },
  { href: '/dashboard/media', label: 'Media' },
  { href: '/dashboard/users', label: 'Users' },
  { href: '/dashboard/configurations', label: 'Configurations' },
];

// learn.shahidiqbal.com is a separate Next.js app with its own login —
// this switches the browser to its admin area, it cannot carry this
// session over (different subdomain, different session cookie).
const LEARN_ADMIN_URL = 'https://learn.shahidiqbal.com/admin';

/**
 * Every admin_users account that can log in at all can see this shell;
 * individual sections below re-check specific permissions themselves
 * (per docs/ADMIN_ARCHITECTURE.md's RBAC model) rather than relying on
 * this layout to gate anything beyond "is a logged-in staff member".
 */
/**
 * Switches between this app's admin and apps/learn's admin — two
 * separate Next.js apps on separate subdomains with separate session
 * cookies, so this is a navigation convenience, not single sign-on: the
 * other side still needs its own login if that session has expired.
 */
function AppSwitcher({ active }: { active: 'admin' | 'learn' }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      <a
        href="/dashboard"
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
          active === 'admin' ? 'bg-neon text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        <Image src="/brand/logo-stacked-dark-bg.png" alt="" width={320} height={502} className="h-5 w-auto" />
        Shahid Admin
      </a>
      <a
        href={LEARN_ADMIN_URL}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
          active === 'learn' ? 'bg-neon text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        <Image src="/brand/learn-logo-192.png" alt="" width={192} height={192} className="h-5 w-auto" />
        Learn Admin
      </a>
    </div>
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  const roleNames = await getUserRoleNames(user.id);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-bg-elevated p-4">
        <Link href="/dashboard" className="mb-6 block">
          <Image src="/brand/logo-horizontal-dark-bg-nav.png" alt="Shahid Security" width={340} height={162} className="h-10 w-auto" priority />
        </Link>
        <nav className="space-y-1 text-sm">
          {NAV_SECTIONS.map((section) => (
            <Link key={section.href} href={section.href} className="block rounded px-2 py-1.5 text-text-muted hover:bg-surface hover:text-text">
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
          <p>{user.fullName}</p>
          <p>{[...roleNames].join(', ') || 'No role assigned'}</p>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="mb-6 flex justify-end">
          <AppSwitcher active="admin" />
        </div>
        {children}
      </main>
    </div>
  );
}
