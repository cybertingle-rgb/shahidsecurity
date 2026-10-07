'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/brand/logo-stacked-dark-bg.png" alt="Shahid Security" width={800} height={1255} className="h-20 w-auto" priority />
        <h1 className="text-lg font-semibold">Reset your password</h1>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        {message ? (
          <p className="text-sm text-text-muted">{message}</p>
        ) : (
          <>
            <p className="text-sm text-text-muted">Enter your admin account email and we&apos;ll send a reset link.</p>
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
                className="w-full rounded-md border border-border bg-bg px-3 py-2 focus:border-neon focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-neon px-4 py-2 font-medium text-bg disabled:opacity-60"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
      </form>
      <Link href="/login" className="text-sm text-text-muted underline">
        Back to sign in
      </Link>
    </div>
  );
}
