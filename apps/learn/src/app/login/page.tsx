'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 text-text">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold">Log in</h1>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-text-muted" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <button type="submit" disabled={submitting} className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg disabled:opacity-60">
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
        <p className="text-sm text-text-muted">
          No account?{' '}
          <Link href="/register" className="text-neon">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
