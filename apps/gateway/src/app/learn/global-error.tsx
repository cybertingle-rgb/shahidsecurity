'use client';

/**
 * Catches an error thrown in the root layout itself (above where
 * error.tsx can reach) — must render its own <html>/<body> since it
 * replaces the root layout entirely when active.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-4 rounded-lg border border-red-500/40 bg-red-500/5 p-6 text-center">
            <h1 className="text-lg font-semibold">The application failed to load</h1>
            <p className="text-sm text-white/70">
              {error.message || 'An unexpected error occurred.'}
              {error.digest && <span className="mt-1 block text-xs text-white/50">Reference: {error.digest}</span>}
            </p>
            <button type="button" onClick={() => reset()} className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
