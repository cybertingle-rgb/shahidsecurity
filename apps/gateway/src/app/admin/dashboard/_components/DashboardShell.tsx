'use client';

import Image from 'next/image';
import Link from '@/admin-core/_compat/link';
import { usePathname } from '@/admin-core/_compat/navigation-client';
import type { ReactNode } from 'react';
import { AppSwitcher } from './AppSwitcher';
import { BUSINESS_NAV, LEARN_NAV, LEARN_SECTION_PREFIX, groupNav, visibleNav } from './nav-config';
import PortalSidebar, { type PortalNavSection } from '@/admin-core/components/PortalSidebar';
import { BASE_PATH } from '@/admin-core/lib/basePath';

interface DashboardShellProps {
  userName: string;
  userRole: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  /** This admin's permission keys (src/lib/rbac.ts) — a plain array, not a Set, since it crosses the server/client component boundary as a prop. */
  permissionKeys: string[];
  logoutAction: () => void | Promise<void>;
  children: ReactNode;
}

/**
 * Client component wrapping the glass portal shell (header, sidebar,
 * main) — needs usePathname() to decide which nav section (Business vs
 * Learn) and which brand logo to show, the same reason the old
 * SidebarBrand.tsx it replaces was already a client component. The
 * actual session/role lookup stays in layout.tsx (a Server Component),
 * which passes the already-resolved userName/userRole down as props.
 */
export function DashboardShell({ userName, userRole, avatarUrl, isSuperAdmin, permissionKeys, logoutAction, children }: DashboardShellProps) {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;
  const keys = new Set(permissionKeys);
  const sections: PortalNavSection[] = groupNav(visibleNav(inLearn ? LEARN_NAV : BUSINESS_NAV, keys, isSuperAdmin));
  const canAccessLearn = isSuperAdmin || keys.has('learn.manage');

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="portal-bg-orbs" aria-hidden="true" />
      <header className="portal-header sticky top-0 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-5">
        <a href="/" className="flex shrink-0 items-center" aria-label="Shahid Security homepage">
          <Image src={`${BASE_PATH}/brand/shahid-icon-square.png`} alt="Shahid Security" width={192} height={192} className="h-9 w-9 object-contain" priority />
        </a>
        <div className="flex flex-col items-center gap-4">
          <Link href={inLearn ? '/dashboard/learn' : '/dashboard'} className="flex items-center gap-3">
            {inLearn ? (
              <>
                <Image src={`${BASE_PATH}/brand/learn-icon-square.png`} alt="" width={192} height={192} className="h-10 w-10 shrink-0 object-contain" priority />
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-text">Learn with Shahid</span>
                  <span className="block text-xs text-text-muted">Admin</span>
                </span>
              </>
            ) : (
              <Image src={`${BASE_PATH}/brand/logo-horizontal-dark-bg-nav.png`} alt="Shahid Security" width={340} height={162} className="h-10 w-auto" priority />
            )}
          </Link>
          <AppSwitcher canAccessLearn={canAccessLearn} />
        </div>
        <span aria-hidden="true" />
      </header>
      <div className="flex flex-col gap-6 p-6 sm:flex-row">
        <PortalSidebar
          sections={sections}
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
          logoutAction={logoutAction}
          storageKey="admin-dashboard-sidebar-collapsed"
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
