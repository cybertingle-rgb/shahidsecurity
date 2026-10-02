import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCourse, listInstructors, listModulesWithLessons, getCourseProductAndPrice } from '@/lib/admin/courses';
import { updateCourse, setCourseStatus, createModule, deleteModule, createLesson, deleteLesson } from '../actions';
import ThumbnailUrlField from '@/components/ThumbnailUrlField';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

function formatMajorUnits(amountMinorUnits: number): string {
  return (amountMinorUnits / 100).toFixed(2);
}

const NEXT_STATUS: Record<string, { label: string; status: 'draft' | 'review' | 'published' | 'archived' }[]> = {
  draft: [{ label: 'Submit for review', status: 'review' }],
  review: [
    { label: 'Publish', status: 'published' },
    { label: 'Back to draft', status: 'draft' },
  ],
  published: [{ label: 'Archive', status: 'archived' }],
  archived: [{ label: 'Restore to draft', status: 'draft' }],
};

const LESSON_TYPES = ['text', 'video', 'pdf', 'image', 'code', 'quiz', 'assignment', 'external_resource', 'download'] as const;

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, instructors, modules, productAndPrice] = await Promise.all([
    getCourse(id),
    listInstructors(),
    listModulesWithLessons(id),
    getCourseProductAndPrice(id),
  ]);
  if (!course) notFound();

  const currentPrice = productAndPrice?.price;

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{course.title}</h1>
        <span className="text-sm text-text-muted">{course.status}</span>
      </div>

      <div className="flex gap-2">
        {(NEXT_STATUS[course.status] ?? []).map((transition) =>
          transition.status === 'archived' ? (
            <form key={transition.status} action={setCourseStatus.bind(null, id, transition.status)}>
              <ConfirmSubmitButton
                confirmMessage={`Archive "${course.title}"? It will be hidden from the public catalog — students already enrolled keep their access.`}
                className="rounded-md border border-border-strong px-3 py-1.5 text-sm"
              >
                {transition.label}
              </ConfirmSubmitButton>
            </form>
          ) : (
            <form key={transition.status} action={setCourseStatus.bind(null, id, transition.status)}>
              <button type="submit" className="rounded-md border border-border-strong px-3 py-1.5 text-sm">
                {transition.label}
              </button>
            </form>
          ),
        )}
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
        <ThumbnailUrlField defaultValue={course.thumbnailUrl ?? ''} />
        <div>
          <label className="block text-sm text-text-muted" htmlFor="category">
            Category
          </label>
          <input id="category" name="category" defaultValue={course.category ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
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
              defaultValue={currentPrice ? formatMajorUnits(currentPrice.amount) : ''}
              placeholder="0.00 = free"
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted" htmlFor="salePriceAmount">
              Discounted price (optional)
            </label>
            <input
              id="salePriceAmount"
              name="salePriceAmount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={currentPrice?.saleAmount ? formatMajorUnits(currentPrice.saleAmount) : ''}
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">Leave price blank or 0 for a free course.</p>

        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="featured" defaultChecked={course.featured} /> Feature this course on the homepage
        </label>

        <div>
          <label className="block text-sm text-text-muted" htmlFor="learningOutcomes">
            What students will learn (one per line)
          </label>
          <textarea
            id="learningOutcomes"
            name="learningOutcomes"
            rows={3}
            defaultValue={(course.learningOutcomes ?? []).join('\n')}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="requirements">
            Requirements (one per line)
          </label>
          <textarea
            id="requirements"
            name="requirements"
            rows={3}
            defaultValue={(course.requirements ?? []).join('\n')}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="targetAudience">
            Who this course is for
          </label>
          <input id="targetAudience" name="targetAudience" defaultValue={course.targetAudience ?? ''} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>

        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save changes
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Modules & lessons</h2>

        {modules.map((mod) => (
          <div key={mod.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{mod.title}</p>
              <form action={deleteModule.bind(null, id, mod.id)}>
                <ConfirmSubmitButton confirmMessage={`Delete the module "${mod.title}" and all its lessons? This cannot be undone.`} className="text-xs text-danger">
                  Delete module
                </ConfirmSubmitButton>
              </form>
            </div>

            <ul className="mt-3 space-y-2">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2 text-sm">
                  <Link href={`/admin/courses/${id}/lessons/${lesson.id}`} className="text-neon">
                    {lesson.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted">{lesson.type}</span>
                    {lesson.isFreePreview && <span className="text-xs text-neon-soft">free preview</span>}
                    <form action={deleteLesson.bind(null, id, lesson.id)}>
                      <ConfirmSubmitButton confirmMessage={`Delete the lesson "${lesson.title}"? This cannot be undone.`} className="text-xs text-danger">
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              ))}
              {mod.lessons.length === 0 && <li className="text-sm text-text-muted">No lessons yet.</li>}
            </ul>

            <form action={createLesson.bind(null, id, mod.id)} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <div>
                <label className="block text-xs text-text-muted">New lesson title</label>
                <input name="title" required className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-text-muted">Type</label>
                <select name="type" className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm">
                  {LESSON_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-1 text-xs text-text-muted">
                <input type="checkbox" name="isFreePreview" /> Free preview
              </label>
              <button type="submit" className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                Add lesson
              </button>
            </form>
          </div>
        ))}

        <form action={createModule.bind(null, id)} className="flex items-end gap-2 rounded-lg border border-dashed border-border-strong p-4">
          <div className="flex-1">
            <label className="block text-xs text-text-muted">New module title</label>
            <input name="title" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Add module
          </button>
        </form>
      </div>
    </div>
  );
}
