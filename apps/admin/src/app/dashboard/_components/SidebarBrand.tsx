'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LEARN_SECTION_PREFIX } from './nav-config';

/**
 * The sidebar header logo — swaps to Learn with Shahid's own mark (the
 * same shield-with-graduation-cap + "Learn with Shahid" wordmark
 * apps/learn's own header uses) under /dashboard/learn, instead of
 * always showing the Shahid Security business logo regardless of which
 * section you're actually in.
 */
export function SidebarBrand() {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;

  if (inLearn) {
    return (
      <Link href="/dashboard/learn" className="mb-6 flex items-center gap-3">
        <Image src="/brand/learn-icon-square.png" alt="" width={192} height={192} className="h-10 w-10 shrink-0 object-contain" priority />
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-text">Learn with Shahid</span>
          <span className="block text-xs text-text-muted">Admin</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/dashboard" className="mb-6 block">
      <Image src="/brand/logo-horizontal-dark-bg-nav.png" alt="Shahid Security" width={340} height={162} className="h-10 w-auto" priority />
    </Link>
  );
}
