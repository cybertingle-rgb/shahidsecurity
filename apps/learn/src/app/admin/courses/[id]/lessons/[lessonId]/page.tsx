import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLesson, getLessonVideoSource, getAssignment, getQuizWithQuestions } from '@/lib/admin/courses';
import { updateLessonContent, upsertQuiz, addQuizQuestion, deleteQuizQuestion } from '../../../actions';

const LESSON_TYPES = ['text', 'video', 'pdf', 'image', 'code', 'quiz', 'assignment', 'external_resource', 'download'] as const;

export default async function EditLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id: courseId, lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) notFound();

  const [videoSource, assignment, quiz] = await Promise.all([
    lesson.type === 'video' ? getLessonVideoSource(lessonId) : null,
    lesson.type === 'assignment' ? getAssignment(lessonId) : null,
    lesson.type === 'quiz' ? getQuizWithQuestions(lessonId) : null,
  ]);

  const content = (lesson.content ?? {}) as Record<string, string>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/admin/courses/${courseId}`} className="text-sm text-neon">
        ← Back to course
      </Link>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>

      <form action={updateLessonContent.bind(null, lessonId)} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" defaultValue={lesson.title} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="type">
            Type
          </label>
          <select id="type" name="type" defaultValue={lesson.type} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            {LESSON_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="isFreePreview" defaultChecked={lesson.isFreePreview} /> Free preview (visible without enrollment)
        </label>

        {lesson.type === 'text' && (
          <div>
            <label className="block text-sm text-text-muted" htmlFor="body">
              Body
            </label>
            <textarea id="body" name="body" defaultValue={content.body ?? ''} rows={8} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
        )}

        {(lesson.type === 'pdf' || lesson.type === 'download' || lesson.type === 'external_resource' || lesson.type === 'image') && (
          <div>
            <label className="block text-sm text-text-muted" htmlFor="url">
              URL
            </label>
            <input id="url" name="url" defaultValue={content.url ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
        )}

        {lesson.type === 'code' && (
          <>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="language">
                Language
              </label>
              <input id="language" name="language" defaultValue={content.language ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="code">
                Code
              </label>
              <textarea id="code" name="code" defaultValue={content.code ?? ''} rows={8} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 font-mono text-sm" />
            </div>
          </>
        )}

        {lesson.type === 'video' && (
          <>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="provider">
                Provider
              </label>
              <select id="provider" name="provider" defaultValue={videoSource?.provider ?? 'youtube_unlisted'} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
                <option value="youtube_unlisted">YouTube (unlisted)</option>
                <option value="vimeo">Vimeo</option>
                <option value="cloud_storage">Cloud storage (direct file URL)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="providerReference">
                Video ID / URL
              </label>
              <input
                id="providerReference"
                name="providerReference"
                defaultValue={videoSource?.providerReference ?? ''}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
              />
            </div>
          </>
        )}

        {lesson.type === 'assignment' && (
          <>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="instructions">
                Instructions
              </label>
              <textarea
                id="instructions"
                name="instructions"
                defaultValue={assignment?.instructions ?? ''}
                rows={6}
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="submissionType">
                Submission type
              </label>
              <select id="submissionType" name="submissionType" defaultValue={assignment?.submissionType ?? 'text'} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
                <option value="text">Text</option>
                <option value="file_upload">File upload</option>
                <option value="external_link">External link</option>
              </select>
            </div>
          </>
        )}

        {lesson.type === 'quiz' && <p className="text-sm text-text-muted">Configure the quiz and its questions below.</p>}

        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>

      {lesson.type === 'quiz' && (
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Quiz settings</h2>
          <form action={upsertQuiz.bind(null, lessonId)} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-text-muted">Passing %</label>
              <input name="passingPercentage" type="number" min={0} max={100} defaultValue={quiz?.passingPercentage ?? 70} className="w-24 rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-text-muted">Max attempts (blank = unlimited)</label>
              <input name="maxAttempts" type="number" min={1} defaultValue={quiz?.maxAttempts ?? ''} className="w-24 rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
            </div>
            <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
              Save quiz settings
            </button>
          </form>

          {quiz && (
            <>
              <h3 className="text-sm font-semibold text-text-muted">Questions</h3>
              <ul className="space-y-2">
                {quiz.questions.map((q) => (
                  <li key={q.id} className="rounded-md border border-border bg-bg-elevated/40 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p>
                        <span className="text-text-muted">[{q.type}]</span> {q.prompt}
                      </p>
                      <form action={deleteQuizQuestion.bind(null, lessonId, q.id)}>
                        <button type="submit" className="text-xs text-danger">
                          Delete
                        </button>
                      </form>
                    </div>
                    {q.options && <p className="mt-1 text-xs text-text-muted">Options: {q.options.join(', ')}</p>}
                    <p className="mt-1 text-xs text-neon-soft">Correct: {JSON.stringify(q.correctAnswer)}</p>
                  </li>
                ))}
                {quiz.questions.length === 0 && <li className="text-sm text-text-muted">No questions yet.</li>}
              </ul>

              <form action={addQuizQuestion.bind(null, quiz.id, lessonId)} className="space-y-3 border-t border-border pt-3">
                <div>
                  <label className="block text-xs text-text-muted">Type</label>
                  <select name="type" className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm">
                    <option value="multiple_choice">Multiple choice (one answer)</option>
                    <option value="multiple_answer">Multiple answer (several correct)</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Prompt</label>
                  <input name="prompt" required className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Options (one per line — multiple choice/answer only)</label>
                  <textarea name="options" rows={4} className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">
                    Correct answer — exact option text for multiple choice, comma-separated for multiple answer, "true"/"false" for true-false, exact text for short answer
                  </label>
                  <input name="correctAnswer" className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-text-muted">Explanation (optional, shown after submit)</label>
                  <input name="explanation" className="w-full rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
                </div>
                <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                  Add question
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
