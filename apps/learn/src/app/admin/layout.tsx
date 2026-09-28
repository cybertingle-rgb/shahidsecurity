import type { ReactNode } from 'react';
import Image from 'next/image';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

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
      <header className="portal-header sticky top-0 z-10 flex items-center gap-3 px-6 py-4">
        <Image src="/icon.png" alt="Shahid Security" width={40} height={40} className="drop-shadow-[0_0_12px_rgba(0,191,99,0.35)]" priority />
        <div>
          <p className="text-sm font-medium tracking-wide text-neon">Learn with Shahid — Admin</p>
          <p className="text-lg font-semibold">{user.fullName}</p>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
