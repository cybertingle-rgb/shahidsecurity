import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { getPublicCourseBySlug, getCourseAccessState } from '@/lib/public/courses';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);
  if (!course) notFound();

  const user = await getSessionUser();
  const access = await getCourseAccessState(user?.id ?? null, course.id);
  const hasDiscount = course.saleAmount != null && course.priceAmount != null && course.saleAmount < course.priceAmount;
  const isFree = course.priceAmount === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 text-text">
      <Link href="/courses" className="text-sm text-text-muted hover:text-text">
        ← All courses
      </Link>

      <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-border bg-surface">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-entered external URL
          <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">No thumbnail</div>
        )}
      </div>

      <h1 className="mt-6 text-3xl font-semibold">{course.title}</h1>
      {course.shortDescription && <p className="mt-2 text-text-muted">{course.shortDescription}</p>}

      <p className="mt-3 text-sm text-text-muted">
        {course.instructorName && `By ${course.instructorName} · `}
        {LEVEL_LABEL[course.level] ?? course.level}
        {course.moduleCount > 0 && ` · ${course.moduleCount} module${course.moduleCount === 1 ? '' : 's'}`}
        {course.lessonCount > 0 && ` · ${course.lessonCount} lesson${course.lessonCount === 1 ? '' : 's'}`}
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-lg border border-border bg-bg-elevated p-4">
        <div className="flex-1">
          {isFree ? (
            <span className="text-xl font-semibold text-neon">Free</span>
          ) : course.priceAmount != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-neon">{formatAmount(hasDiscount ? course.saleAmount! : course.priceAmount, course.currencyCode)}</span>
              {hasDiscount && <span className="text-sm text-text-muted line-through">{formatAmount(course.priceAmount, course.currencyCode)}</span>}
            </div>
          ) : (
            <span className="text-sm text-text-muted">Not currently available</span>
          )}
        </div>
        {access === 'owned' && (
          <Link href={`/dashboard/courses/${course.id}`} className="rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
            Continue Learning
          </Link>
        )}
        {access === 'guest' && (
          <Link href={`/login?next=/courses/${course.slug}`} className="rounded-md border border-border-strong px-5 py-2.5 font-medium text-text">
            Log in to enroll
          </Link>
        )}
        {access === 'enrollable_free' && course.productId && (
          <Link href={`/dashboard/checkout/${course.productId}`} className="rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
            Enroll for free
          </Link>
        )}
        {access === 'purchasable' && course.productId && (
          <Link href={`/dashboard/checkout/${course.productId}`} className="rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
            Buy Course
          </Link>
        )}
      </div>

      {course.fullDescription && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">About this course</h2>
          <p className="mt-2 whitespace-pre-wrap text-text-muted">{course.fullDescription}</p>
        </div>
      )}

      {course.learningOutcomes.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">What you&apos;ll learn</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {course.learningOutcomes.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-muted">
                <span className="text-neon">✓</span> {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {course.requirements.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-text-muted">
            {course.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {course.targetAudience && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Who this course is for</h2>
          <p className="mt-2 text-text-muted">{course.targetAudience}</p>
        </div>
      )}

      {course.modules.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Curriculum</h2>
          <div className="mt-2 space-y-2">
            {course.modules.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{m.title}</p>
                {m.lessonTitles.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm text-text-muted">
                    {m.lessonTitles.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
