import { listInstructors } from '@/lib/admin/courses';
import { createCourse } from '../actions';
import ThumbnailUrlField from '@/components/ThumbnailUrlField';

export default async function NewCoursePage() {
  const instructors = await listInstructors();
  const defaultInstructor = instructors.find((i) => i.displayName === 'Shahid Iqbal');

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
          <label className="block text-sm text-text-muted" htmlFor="fullDescription">
            Full description
          </label>
          <textarea id="fullDescription" name="fullDescription" rows={4} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <ThumbnailUrlField />
        <div>
          <label className="block text-sm text-text-muted" htmlFor="category">
            Category
          </label>
          <input id="category" name="category" placeholder="e.g. Network Security" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
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
          <select id="instructorId" name="instructorId" defaultValue={defaultInstructor?.id ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="">—</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
          <div>
            <label className="block text-sm text-text-muted" htmlFor="priceAmount">
              Price (USD)
            </label>
            <input
              id="priceAmount"
              name="priceAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 = free"
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted" htmlFor="salePriceAmount">
              Discounted price (optional)
            </label>
            <input id="salePriceAmount" name="salePriceAmount" type="number" step="0.01" min="0" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>
        </div>
        <p className="text-xs text-text-muted">Leave price blank or 0 for a free course. This is the only place a course's price is set — there's no separate product to create.</p>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="featured" /> Feature this course on the homepage
        </label>

        <div>
          <label className="block text-sm text-text-muted" htmlFor="learningOutcomes">
            What students will learn (one per line)
          </label>
          <textarea id="learningOutcomes" name="learningOutcomes" rows={3} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="requirements">
            Requirements (one per line)
          </label>
          <textarea id="requirements" name="requirements" rows={3} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="targetAudience">
            Who this course is for
          </label>
          <input id="targetAudience" name="targetAudience" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>

        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Create draft
        </button>
      </form>
    </div>
  );
}
