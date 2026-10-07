import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { SidebarNav } from './_components/SidebarNav';
import { AppSwitcher } from './_components/AppSwitcher';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) { redirect('/login'); }
  const roleNames = await getUserRoleNames(user.id);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-bg-elevated p-4">
        <Link href="/dashboard" className="mb-6 block">
          <Image src="/brand/logo-horizontal-dark-bg-nav.png" alt="Shahid Security" width={340} height={162} className="h-10 w-auto" priority />
        </Link>
        <SidebarNav />
        <div className="mt-8 border-t border-border pt-4 text-xs text-text-muted">
          <p>{user.fullName}</p>
          <p>{[...roleNames].join(', ') || 'No role assigned'}</p>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <div className="mb-6 flex justify-end">
          <AppSwitcher />
        </div>
        {children}
      </main>
    </div>
  );
}
