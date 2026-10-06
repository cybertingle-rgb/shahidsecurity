import Link from 'next/link';
import { listKnowledgeSources } from '@/lib/ai';
import { createKnowledgeSource, approveKnowledgeSource, rejectKnowledgeSource } from './actions';
import type { InferSelectModel } from 'drizzle-orm';
import type { aiKnowledgeSources } from '@/db/schema';

type KnowledgeSource = InferSelectModel<typeof aiKnowledgeSources>;

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-text-muted',
  approved: 'text-neon-soft',
  rejected: 'text-danger',
};

function KnowledgeSourceRow({ source }: { source: KnowledgeSource }) {
  const approve = approveKnowledgeSource.bind(null, source.id);
  const reject = rejectKnowledgeSource.bind(null, source.id);

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-2">
        <p className="font-medium">{source.title}</p>
        <p className="mt-1 max-w-md text-text-muted">{source.bodyMarkdown}</p>
      </td>
      <td className="px-4 py-2">
        <span className={STATUS_COLOR[source.status]}>{source.status}</span>
      </td>
      <td className="px-4 py-2">
        {source.status === 'draft' && (
          <div className="flex gap-2">
            <form action={approve}>
              <button type="submit" className="text-xs text-neon underline">
                approve
              </button>
            </form>
            <form action={reject}>
              <button type="submit" className="text-xs text-danger underline">
                reject
              </button>
            </form>
          </div>
        )}
      </td>
    </tr>
  );
}

export default async function AiKnowledgePage() {
  const sources = await listKnowledgeSources();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI knowledge sources</h1>
        <Link href="/dashboard/ai/questions" className="text-sm text-neon">
          Unanswered questions →
        </Link>
      </div>

      <div className="rounded-lg border border-warn/40 bg-warn/5 p-4 text-sm text-text-muted">
        <strong className="text-warn">Not yet wired to Luna.</strong> Luna (the chatbot on shahidiqbal.com and
        learn.shahidiqbal.com) currently runs on a hand-curated static system prompt in apps/learn — approving a
        source here records the decision correctly, but actually feeding it into Luna's answers needs a follow-up
        integration (apps/learn fetching approved sources from this app at request or build time), not yet built.
      </div>

      <form action={createKnowledgeSource} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <h2 className="text-sm font-medium">Add a knowledge source</h2>
        <p className="text-xs text-text-muted">Must be a real, verifiable fact — this form has no AI generation and no placeholder content.</p>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="bodyMarkdown">
            Content
          </label>
          <textarea id="bodyMarkdown" name="bodyMarkdown" rows={4} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add as draft
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <KnowledgeSourceRow key={s.id} source={s} />
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                  No knowledge sources yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
