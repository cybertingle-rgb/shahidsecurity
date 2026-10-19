'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import RainField from '@/components/RainField';
import SocialRail from '@/components/SocialRail';
import AuthCard from '@/components/AuthCard';

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
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-text lg:pr-28">
      <RainField />
      <SocialRail />
      <Image
        src="/brand/logo-stacked-dark-bg.png"
        alt="Shahid Security"
        width={800}
        height={1255}
        className="relative z-10 h-20 w-auto drop-shadow-[0_0_24px_rgba(0,191,99,0.45)]"
        priority
      />
      <AuthCard title="Admin sign in">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm focus:border-neon focus:outline-none"
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
              className="w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 backdrop-blur-sm focus:border-neon focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-success)] transition hover:shadow-[0_0_28px_-2px_var(--color-success)] disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-text-muted underline">
              Forgot password?
            </Link>
          </p>
        </form>
      </AuthCard>
    </div>
  );
}
