import type { ReactNode } from 'react';
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
  { href: '/dashboard/media', label: 'Media' },
  { href: '/dashboard/users', label: 'Users' },
];

/**
 * Every admin_users account that can log in at all can see this shell;
 * individual sections below re-check specific permissions themselves
 * (per docs/ADMIN_ARCHITECTURE.md's RBAC model) rather than relying on
 * this layout to gate anything beyond "is a logged-in staff member".
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  const roleNames = await getUserRoleNames(user.id);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-bg-elevated p-4">
        <p className="mb-6 text-sm font-medium text-neon">Shahid Security — Admin</p>
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
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
