'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Neither app in this repo had an error.tsx anywhere before this file —
 * confirmed by a repo-wide search. Every render-time exception (a slow
 * query, a dropped DB connection, a hydration mismatch, anything) had no
 * segment-level recovery boundary to catch it, so whatever generic
 * fallback Next.js falls back to is what an admin actually saw, with no
 * retry affordance beyond a manual browser reload — which "worked" only
 * because a fresh request is a fresh attempt, not because anything was
 * actually fixed. This doesn't suppress the error (it's still logged
 * below) or hide a real failure as success — it gives the same failure a
 * real retry path (`reset()` re-renders this segment in place, without a
 * full page reload) and an honest, specific message instead of a dead end.
 */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side errors are already logged with a digest by Next.js
    // itself; this is the one place a client-side-only error (one that
    // never touched the server at all) gets recorded anywhere.
    console.error('[dashboard error boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 rounded-lg border border-danger/40 bg-danger/5 p-6 text-center">
        <h1 className="text-lg font-semibold text-text">Something went wrong loading this page</h1>
        <p className="text-sm text-text-muted">
          {error.message || 'An unexpected error occurred.'}
          {error.digest && <span className="mt-1 block text-xs text-text-muted">Reference: {error.digest}</span>}
        </p>
        <p className="text-xs text-text-muted">
          If you just submitted a form, check whether the change actually went through before retrying — a failed
          page load does not always mean the underlying action failed.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button type="button" onClick={() => reset()} className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Try again
          </button>
          <Link href="/dashboard" className="rounded-md border border-border px-4 py-2 text-sm text-text-muted">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
