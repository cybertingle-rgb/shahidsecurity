'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import EduBackground from '@/components/EduBackground';
import AuthCard from '@/components/AuthCard';
import GoogleButton, { googleOAuthErrorMessage } from '@/components/GoogleButton';

function RegisterForm() {
  const searchParams = useSearchParams();
  const oauthError = googleOAuthErrorMessage(searchParams.get('error'));
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
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

  return (
    <AuthCard title="Create your account">
      <div className="space-y-4">
        {(error || oauthError) && <p className="text-sm text-danger">{error ?? oauthError}</p>}
        {message && <p className="text-sm text-neon-soft">{message}</p>}
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-text-muted" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm focus:border-neon focus:outline-none"
            />
          </div>
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
              className="w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm focus:border-neon focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-text-muted" htmlFor="password">
              Password (min. 10 characters)
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
            disabled={submitting}
            className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)] disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
          <p className="text-sm text-text-muted">
            Already registered?{' '}
            <Link href="/login" className="text-neon">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-text">
      <EduBackground />
      <Image
        src="/logo.png"
        alt="Shahid Security"
        width={150}
        height={150}
        className="relative z-10 drop-shadow-[0_0_24px_rgba(0,191,99,0.45)]"
        priority
      />
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
