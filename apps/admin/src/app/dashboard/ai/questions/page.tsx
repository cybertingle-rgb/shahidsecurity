import { listUnansweredQuestions } from '@/lib/ai';
import { markQuestionReviewed } from '../actions';
import type { InferSelectModel } from 'drizzle-orm';
import type { aiQuestions } from '@/db/schema';

type AiQuestion = InferSelectModel<typeof aiQuestions>;

function QuestionRow({ question }: { question: AiQuestion }) {
  const markReviewed = markQuestionReviewed.bind(null, question.id);
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2">{question.questionText}</td>
      <td className="px-4 py-2 text-text-muted">{question.createdAt.toLocaleString()}</td>
      <td className="px-4 py-2">
        {question.reviewedByUserId ? (
          <span className="text-text-muted">reviewed</span>
        ) : (
          <form action={markReviewed}>
            <button type="submit" className="text-xs text-neon underline">
              mark reviewed
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function AiQuestionsPage() {
  const questions = await listUnansweredQuestions();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Unanswered questions</h1>
      <p className="text-sm text-text-muted">
        Questions Luna fell through to the Claude API for — i.e. ones its curated instant-answer set didn&apos;t
        cover. Use these to decide what&apos;s worth adding as a knowledge source.
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Question</th>
              <th className="px-4 py-2">Asked</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <QuestionRow key={q.id} question={q} />
            ))}
            {questions.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                  No questions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
