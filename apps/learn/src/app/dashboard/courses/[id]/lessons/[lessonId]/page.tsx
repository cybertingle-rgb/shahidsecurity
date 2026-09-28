import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getLessonForPlayer } from '@/lib/student/data';
import QuizRunner from '@/components/QuizRunner';
import { markComplete, submitQuiz } from './actions';

function videoEmbedUrl(provider: string, ref: string): string {
  if (provider === 'youtube_unlisted') return `https://www.youtube.com/embed/${ref}`;
  if (provider === 'vimeo') return `https://player.vimeo.com/video/${ref}`;
  return ref;
}

export default async function LessonPlayerPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id: courseId, lessonId } = await params;
  const session = await getSessionUser();
  if (!session) notFound();

  const data = await getLessonForPlayer(session.id, lessonId);
  if (!data) notFound();

  if (data.locked) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-text-muted">This lesson requires enrollment.</p>
        <Link href={`/dashboard/courses/${courseId}`} className="text-neon">
          ← Back to course
        </Link>
      </div>
    );
  }

  const { lesson, videoSource, quiz, progressStatus, courseTitle } = data;
  const content = (lesson.content ?? {}) as Record<string, string>;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/dashboard/courses/${courseId}`} className="text-sm text-neon">
        ← {courseTitle}
      </Link>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>

      {lesson.type === 'text' && <p className="whitespace-pre-wrap leading-relaxed text-text">{content.body}</p>}

      {lesson.type === 'video' && videoSource && (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          {videoSource.provider === 'youtube_unlisted' || videoSource.provider === 'vimeo' ? (
            <iframe src={videoEmbedUrl(videoSource.provider, videoSource.providerReference)} className="h-full w-full" allowFullScreen />
          ) : (
            // A direct file URL (cloud_storage/other) is a real video resource,
            // not a page to embed — <video> with preload="metadata" (not
            // "auto") so opening the lesson doesn't start downloading the
            // whole file before the student presses play.
            <video src={videoSource.providerReference} controls preload="metadata" className="h-full w-full bg-black" />
          )}
        </div>
      )}

      {(lesson.type === 'pdf' || lesson.type === 'download' || lesson.type === 'external_resource' || lesson.type === 'image') && content.url && (
        <a href={content.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Open resource
        </a>
      )}

      {lesson.type === 'code' && (
        <pre className="overflow-x-auto rounded-lg border border-border bg-bg-elevated p-4 text-sm">
          <code>{content.code}</code>
        </pre>
      )}

      {lesson.type === 'quiz' && quiz && (
        <QuizRunner
          questions={quiz.questions}
          passingPercentage={quiz.passingPercentage}
          attemptsUsed={quiz.attemptsUsed}
          maxAttempts={quiz.maxAttempts}
          onSubmit={submitQuiz.bind(null, courseId, lessonId, quiz.id)}
        />
      )}

      {lesson.type !== 'quiz' && (
        <form action={markComplete.bind(null, courseId, lessonId)}>
          <button
            type="submit"
            disabled={progressStatus === 'completed'}
            className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
          >
            {progressStatus === 'completed' ? 'Completed ✓' : 'Mark as complete'}
          </button>
        </form>
      )}
    </div>
  );
}
