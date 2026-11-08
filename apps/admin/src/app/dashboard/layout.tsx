import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserPermissionKeys, getUserRoleNames } from '@/lib/rbac';
import { logoutAction } from './logout-action';
import { DashboardShell } from './_components/DashboardShell';

/**
 * Same glass-portal shell as apps/learn/src/app/dashboard/layout.tsx —
 * this app's own shell had drifted onto a bare utility-class sidebar
 * (no glass styling, no collapse, no sliding active indicator) while
 * learn's got the full treatment, which is why the two apps read as
 * visually inconsistent. Ported PortalSidebar/PortalIcon over; the
 * actual rendering (which needs usePathname() to pick the Business vs
 * Learn nav section and brand logo) lives in the client DashboardShell
 * component below, same split the old SidebarBrand.tsx already used.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const roleNames = await getUserRoleNames(user.id);
  const isSuperAdmin = roleNames.has('super_admin');
  // Re-read from the database on every request, same as every other RBAC
  // check in this app (src/lib/rbac.ts) — never trusted from a cookie or
  // client state. Drives which sidebar sections DashboardShell actually
  // renders (docs/consolidation/UNIFIED_ARCHITECTURE.md §8): this closes
  // a real gap found while working on that doc — the nav previously
  // showed every section to every signed-in admin regardless of role,
  // even though each page's own server actions already enforced the
  // real permission check correctly.
  const permissionKeys = isSuperAdmin ? new Set<string>() : await getUserPermissionKeys(user.id);

  return (
    <DashboardShell
      userName={isSuperAdmin ? 'Shahid Iqbal' : user.fullName}
      userRole={[...roleNames].join(', ') || 'No role assigned'}
      avatarUrl={isSuperAdmin ? '/avatars/shahid.jpg' : undefined}
      isSuperAdmin={isSuperAdmin}
      permissionKeys={[...permissionKeys]}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  );
}
