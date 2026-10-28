'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * This app had no error.tsx anywhere before this file (confirmed by a
 * repo-wide search) — every render-time exception, on a public course
 * page or inside the authenticated dashboard alike, had no segment-level
 * recovery boundary, so a visitor's only path back was a manual browser
 * reload. This doesn't suppress or hide a real failure — the error is
 * still logged below — it gives the same failure an in-place retry
 * (`reset()` re-renders this segment without a full page reload) and an
 * honest message instead of a dead end.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-danger/40 bg-danger/5 p-6 text-center">
        <h1 className="text-lg font-semibold text-text">Something went wrong loading this page</h1>
        <p className="text-sm text-text-muted">
          {error.message || 'An unexpected error occurred.'}
          {error.digest && <span className="mt-1 block text-xs text-text-muted">Reference: {error.digest}</span>}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button type="button" onClick={() => reset()} className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Try again
          </button>
          <Link href="/" className="rounded-md border border-border px-4 py-2 text-sm text-text-muted">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
