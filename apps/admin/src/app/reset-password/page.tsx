'use client';

import { useState, type FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
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
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-danger">This link is missing its reset token. Request a new one.</p>;
  }

  if (done) {
    return <p className="text-sm text-text-muted">Password reset. Redirecting to sign in…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-1">
        <label className="text-sm text-text-muted" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-neon focus:outline-none"
        />
        <p className="text-xs text-text-muted">At least 12 characters.</p>
      </div>
      <div className="space-y-1">
        <label className="text-sm text-text-muted" htmlFor="confirm">
          Confirm new password
        </label>
        <input
          id="confirm"
          type="password"
          required
          minLength={12}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-neon focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg disabled:opacity-60"
      >
        {submitting ? 'Resetting…' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <p className="text-sm font-medium tracking-wide text-neon">Shahid Security</p>
        <h1 className="text-lg font-semibold">Set a new password</h1>
      </div>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
      <Link href="/login" className="text-sm text-text-muted underline">
        Back to sign in
      </Link>
    </div>
  );
}
