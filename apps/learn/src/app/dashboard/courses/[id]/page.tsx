import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getCoursePlayer } from '@/lib/student/data';

export default async function CoursePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) notFound();

  const data = await getCoursePlayer(session.id, id);
  if (!data) notFound();

  const { course, enrolled, modules } = data;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        {course.shortDescription && <p className="mt-1 text-text-muted">{course.shortDescription}</p>}
        {!enrolled && (
          <p className="mt-3 rounded-md border border-border-strong bg-bg-elevated/60 p-3 text-sm text-text-muted">
            You're not enrolled in this course yet — only lessons marked "free preview" are unlocked. See{' '}
            <Link href="/dashboard/membership" className="text-neon">
              Membership
            </Link>{' '}
            for enrollment options.
          </p>
        )}
      </div>

      {modules.map((mod) => (
        <div key={mod.id} className="rounded-lg border border-border p-4">
          <p className="font-medium">{mod.title}</p>
          <ul className="mt-3 space-y-2">
            {mod.lessons.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2 text-sm">
                {lesson.locked ? (
                  <span className="text-text-muted">🔒 {lesson.title}</span>
                ) : (
                  <Link href={`/dashboard/courses/${id}/lessons/${lesson.id}`} className="text-neon">
                    {lesson.progressStatus === 'completed' ? '✓ ' : ''}
                    {lesson.title}
                  </Link>
                )}
                <span className="text-xs text-text-muted">{lesson.type}</span>
              </li>
            ))}
            {mod.lessons.length === 0 && <li className="text-sm text-text-muted">No lessons yet.</li>}
          </ul>
        </div>
      ))}
      {modules.length === 0 && <p className="text-text-muted">This course doesn't have any content yet.</p>}
    </div>
  );
}
