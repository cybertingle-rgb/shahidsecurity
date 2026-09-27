import { listInstructors } from '@/lib/admin/courses';
import { createCourse } from '../actions';

export default async function NewCoursePage() {
  const instructors = await listInstructors();

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">New course</h1>
      <form action={createCourse} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="shortDescription">
            Short description
          </label>
          <input id="shortDescription" name="shortDescription" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="level">
            Level
          </label>
          <select id="level" name="level" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
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
          <select id="instructorId" name="instructorId" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="">—</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.displayName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create draft
        </button>
      </form>
    </div>
  );
}
