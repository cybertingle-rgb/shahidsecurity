import { notFound } from 'next/navigation';
import { getCourse, listInstructors } from '@/lib/admin/courses';
import { updateCourse, setCourseStatus } from '../actions';

const NEXT_STATUS: Record<string, { label: string; status: 'draft' | 'review' | 'published' | 'archived' }[]> = {
  draft: [{ label: 'Submit for review', status: 'review' }],
  review: [
    { label: 'Publish', status: 'published' },
    { label: 'Back to draft', status: 'draft' },
  ],
  published: [{ label: 'Archive', status: 'archived' }],
  archived: [{ label: 'Restore to draft', status: 'draft' }],
};

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, instructors] = await Promise.all([getCourse(id), listInstructors()]);
  if (!course) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <span className="text-sm text-text-muted">{course.status}</span>
      </div>

      <div className="flex gap-2">
        {(NEXT_STATUS[course.status] ?? []).map((transition) => (
          <form key={transition.status} action={setCourseStatus.bind(null, id, transition.status)}>
            <button type="submit" className="rounded-md border border-border-strong px-3 py-1.5 text-sm">
              {transition.label}
            </button>
          </form>
        ))}
      </div>

      <form action={updateCourse.bind(null, id)} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" defaultValue={course.title} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="shortDescription">
            Short description
          </label>
          <input
            id="shortDescription"
            name="shortDescription"
            defaultValue={course.shortDescription ?? ''}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="fullDescription">
            Full description
          </label>
          <textarea
            id="fullDescription"
            name="fullDescription"
            defaultValue={course.fullDescription ?? ''}
            rows={5}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="level">
            Level
          </label>
          <select id="level" name="level" defaultValue={course.level} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="instructorId">
            Instructor
          </label>
          <select
            id="instructorId"
            name="instructorId"
            defaultValue={course.instructorId ?? ''}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          >
            <option value="">—</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.displayName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save changes
        </button>
      </form>

      <p className="text-sm text-text-muted">
        Modules and lessons are managed once course-player work begins (Phase 5 — see docs/LMS_IMPLEMENTATION_PLAN.md).
      </p>
    </div>
  );
}
