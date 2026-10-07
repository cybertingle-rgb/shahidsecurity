import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

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
      <main className="p-6">{children}</main>
    </div>
  );
}
