'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BUSINESS_NAV, LEARN_NAV, LEARN_SECTION_PREFIX } from './nav-config';

export function SidebarNav() {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;
  const sections = inLearn ? LEARN_NAV : BUSINESS_NAV;

  return (
    <nav className="space-y-1 text-sm">
      {sections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="block rounded px-2 py-1.5 text-text-muted hover:bg-surface hover:text-text"
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
