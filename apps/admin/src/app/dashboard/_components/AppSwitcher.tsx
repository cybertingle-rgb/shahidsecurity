'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LEARN_SECTION_PREFIX } from './nav-config';

export function AppSwitcher() {
  const pathname = usePathname();
  const inLearn = pathname?.startsWith(LEARN_SECTION_PREFIX) ?? false;

  return (
    <div className="relative grid grid-cols-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.25),inset_0_-1px_0_0_rgba(0,0,0,0.25)] backdrop-blur-2xl">
      {/* Sliding active indicator — one element that glides between the two slots, instead of
          each button abruptly swapping its own background. */}
      <div
        aria-hidden
        className={`absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-gradient-to-b from-neon-soft to-neon shadow-[0_4px_20px_-2px_rgba(0,191,99,0.6),inset_0_1px_0_0_rgba(255,255,255,0.35)] transition-transform duration-300 ease-out ${
          inLearn ? 'translate-x-[calc(100%+0.375rem)]' : 'translate-x-0'
        }`}
      />

      <a
        href="/dashboard"
        className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
          !inLearn ? 'text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        {/* A dark frosted-glass chip behind the mark — both logos are green/white-on-transparent,
            so a dark backdrop keeps them visible against either the pill's own green active state
            or the panel's dark glass background, instead of needing a stark white card. */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 p-1 backdrop-blur-sm">
          <Image src="/brand/shahid-icon-square.png" alt="" width={192} height={192} className="h-full w-full object-contain" />
        </span>
        Shahid Admin
      </a>
      <a
        href={LEARN_SECTION_PREFIX}
        className={`relative z-10 flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
          inLearn ? 'text-bg' : 'text-text-muted hover:text-text'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 p-1 backdrop-blur-sm">
          <Image src="/brand/learn-icon-square.png" alt="" width={192} height={192} className="h-full w-full object-contain" />
        </span>
        Learn Admin
      </a>
    </div>
  );
}
