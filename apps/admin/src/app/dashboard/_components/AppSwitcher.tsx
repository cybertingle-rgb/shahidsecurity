'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LEARN_SECTION_PREFIX } from './nav-config';

export function AppSwitcher() {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated p-1">
      <a
        href="/dashboard"
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
          !inLearn ? 'bg-neon text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        <Image src="/brand/logo-stacked-dark-bg.png" alt="" width={320} height={502} className="h-5 w-auto" />
        Shahid Admin
      </a>
      <a
        href={LEARN_SECTION_PREFIX}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
          inLearn ? 'bg-neon text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        <Image src="/brand/learn-logo-192.png" alt="" width={192} height={192} className="h-5 w-auto" />
        Learn Admin
      </a>
    </div>
  );
}
