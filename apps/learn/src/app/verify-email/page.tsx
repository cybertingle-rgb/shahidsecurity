'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EduBackground from '@/components/EduBackground';
import AuthCard from '@/components/AuthCard';

type Status = 'verifying' | 'success' | 'error';

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error');
          setError(data.error ?? 'This verification link is invalid or has expired.');
          return;
        }
        setStatus('success');
      })
      .catch(() => {
        setStatus('error');
        setError('Something went wrong. Please try again.');
      });
  }, [token]);

  return (
    <AuthCard title={status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying…'}>
      <div className="space-y-4 text-center">
        {status === 'verifying' && <p className="text-sm text-text-muted">Confirming your email address…</p>}

        {status === 'success' && (
          <>
            <p className="text-sm text-text-muted">
              Your email has been verified. You can now log in to your account.
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)]"
            >
              Go to login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-sm text-danger">{error}</p>
            <Link href="/register" className="inline-block w-full rounded-md border border-border-strong px-4 py-2 font-medium text-text transition hover:border-neon">
              Back to registration
            </Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-text">
      <EduBackground />
      <Suspense
        fallback={
          <AuthCard title="Verifying…">
            <p className="text-center text-sm text-text-muted">Confirming your email address…</p>
          </AuthCard>
        }
      >
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
