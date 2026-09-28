'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import EduBackground from '@/components/EduBackground';
import AuthCard from '@/components/AuthCard';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      setMessage(data.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (message) {
    return (
      <AuthCard title="Password reset">
        <div className="space-y-4 text-center">
          <p className="text-sm text-text-muted">{message}</p>
          <Link
            href="/login"
            className="inline-block w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)]"
          >
            Go to login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-text-muted" htmlFor="password">
            New password (min. 10 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm focus:border-neon focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !token}
          className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)] disabled:opacity-60"
        >
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
        {!token && <p className="text-sm text-danger">This reset link is missing its token.</p>}
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-text">
      <EduBackground />
      <Suspense
        fallback={
          <AuthCard title="Set a new password">
            <p className="text-center text-sm text-text-muted">Loading…</p>
          </AuthCard>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
