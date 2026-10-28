'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[student dashboard error boundary]', error);
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
          If you just submitted a form or payment, check your orders before retrying — a failed page load does not
          always mean the submission itself failed.
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
