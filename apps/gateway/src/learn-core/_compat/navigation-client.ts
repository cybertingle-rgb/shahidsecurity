'use client';

import { useRouter as useNextRouter, usePathname as useNextPathname } from 'next/navigation';

// Same basePath-replacement reasoning as ./link.tsx. router.push/replace
// need the prefix added (outgoing); usePathname() needs it stripped
// (incoming) so every existing `pathname === '/x'` / `.startsWith('/x')`
// check written back when this app had basePath: '/learn' keeps working
// unmodified — it round-trips exactly like basePath did.
const PREFIX = '/learn';

function withPrefix(url: string): string {
  return url.startsWith('/') && !url.startsWith(PREFIX) ? `${PREFIX}${url}` : url;
}

export function useRouter() {
  const router = useNextRouter();
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(withPrefix(href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(withPrefix(href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(withPrefix(href), options),
  };
}

export function usePathname(): string | null {
  const pathname = useNextPathname();
  if (!pathname) return pathname;
  return pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) || '/' : pathname;
}
