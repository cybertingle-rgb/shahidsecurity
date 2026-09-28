'use client';

import { useState } from 'react';

type Question = { id: string; type: string; prompt: string; options: string[] | null };

export default function QuizRunner({
  questions,
  passingPercentage,
  attemptsUsed,
  maxAttempts,
  onSubmit,
}: {
  questions: Question[];
  passingPercentage: number;
  attemptsUsed: number;
  maxAttempts: number | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; scorePercentage?: number; passed?: boolean }>;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ scorePercentage: number; passed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const attemptsRemaining = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  const canSubmit = attemptsRemaining === null || attemptsRemaining > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit(answers);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      setResult({ scorePercentage: res.scorePercentage ?? 0, passed: res.passed ?? false });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className={result.passed ? 'text-neon-soft' : 'text-danger'}>
          {result.passed ? 'Passed' : 'Not passed'} — {result.scorePercentage}% (need {passingPercentage}%)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-border p-4">
          <p className="font-medium">
            {i + 1}. {q.prompt}
          </p>
          <div className="mt-3 space-y-2">
            {q.type === 'multiple_choice' &&
              q.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={q.id} value={opt} onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} />
                  {opt}
                </label>
              ))}
            {q.type === 'multiple_answer' &&
              q.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      setAnswers((a) => {
                        const current = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
                        const next = e.target.checked ? [...current, opt] : current.filter((v) => v !== opt);
                        return { ...a, [q.id]: next };
                      });
                    }}
                  />
                  {opt}
                </label>
              ))}
            {q.type === 'true_false' && (
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name={q.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: true }))} /> True
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name={q.id} onChange={() => setAnswers((a) => ({ ...a, [q.id]: false }))} /> False
                </label>
              </div>
            )}
            {q.type === 'short_answer' && (
              <input
                type="text"
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}
      {!canSubmit && <p className="text-sm text-danger">No attempts remaining.</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !canSubmit}
        className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit quiz'}
      </button>
    </div>
  );
}
