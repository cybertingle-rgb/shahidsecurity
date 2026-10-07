'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LEARN_SECTION_PREFIX } from './nav-config';

export function AppSwitcher() {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-border-strong/60 bg-gradient-to-b from-bg-elevated to-black/40 p-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur">
      <a
        href="/dashboard"
        className={`group relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out ${
          !inLearn
            ? 'scale-100 bg-gradient-to-b from-neon-soft to-neon text-bg shadow-[0_4px_14px_-2px_rgba(0,191,99,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)]'
            : 'scale-95 text-text-muted hover:scale-100 hover:bg-white/5 hover:text-text'
        }`}
      >
        {/* A solid white chip behind the mark — both logos are green-on-transparent, so without this
            backdrop a logo disappears into the pill's own green active-state background. */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <Image src="/brand/shahid-icon-square.png" alt="" width={192} height={192} className="h-full w-full object-contain" />
        </span>
        Shahid Admin
      </a>
      <a
        href={LEARN_SECTION_PREFIX}
        className={`group relative flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 ease-out ${
          inLearn
            ? 'scale-100 bg-gradient-to-b from-neon-soft to-neon text-bg shadow-[0_4px_14px_-2px_rgba(0,191,99,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)]'
            : 'scale-95 text-text-muted hover:scale-100 hover:bg-white/5 hover:text-text'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <Image src="/brand/learn-icon-square.png" alt="" width={192} height={192} className="h-full w-full object-contain" />
        </span>
        Learn Admin
      </a>
    </div>
  );
}
