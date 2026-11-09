'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

// Platform consolidation: apps/learn stopped being its own Next.js app
// (with its own `basePath: '/learn'` config, which auto-prefixed every
// <Link href>) and became a route segment of the single gateway app
// instead — see docs/consolidation/UNIFIED_ARCHITECTURE.md. A single
// Next.js instance can only have one global basePath, so this drop-in
// replacement reproduces exactly what basePath used to do for this
// section, instead of hand-editing the ~150 Link/router call sites that
// relied on it. Only string hrefs are handled (the only kind this app
// ever used) — an absolute URL (http/https/mailto/tel) or one already
// starting with the prefix passes through untouched.
const PREFIX = '/learn';

type Props = ComponentProps<typeof NextLink>;

export default function Link({ href, ...props }: Props) {
  const prefixed =
    typeof href === 'string' && href.startsWith('/') && !href.startsWith(PREFIX)
      ? `${PREFIX}${href}`
      : href;
  return <NextLink href={prefixed} {...props} />;
}
