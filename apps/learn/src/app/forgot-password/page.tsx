'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import EduBackground from '@/components/EduBackground';
import AuthCard from '@/components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? 'If that email is registered, a password reset link has been sent.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 text-text">
      <EduBackground />
      <AuthCard title="Reset your password">
        {message ? (
          <p className="text-center text-sm text-text-muted">{message}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)] disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-text-muted">
          <Link href="/login" className="text-neon">
            Back to login
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
