import { redirect as nextRedirect, permanentRedirect as nextPermanentRedirect } from 'next/navigation';

// No 'use client' here deliberately — next/navigation's redirect() is
// isomorphic (works from Server Components, Route Handlers, Server
// Actions, and Client Components alike), and this needs to stay callable
// from server-only files without pulling in a client boundary.
const PREFIX = '/admin';

function withPrefix(url: string): string {
  return url.startsWith('/') && !url.startsWith(PREFIX) ? `${PREFIX}${url}` : url;
}

export function redirect(url: string, type?: Parameters<typeof nextRedirect>[1]): never {
  return nextRedirect(withPrefix(url), type);
}

export function permanentRedirect(url: string, type?: Parameters<typeof nextPermanentRedirect>[1]): never {
  return nextPermanentRedirect(withPrefix(url), type);
}
