import Link from 'next/link';
import type { PublicCourseCard, CourseAccessState } from '@/lib/public/courses';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

function CourseCta({ course, access }: { course: PublicCourseCard; access: CourseAccessState }) {
  if (access === 'owned') {
    return (
      <Link href={`/dashboard/courses/${course.id}`} className="block rounded-md bg-neon px-3 py-2 text-center text-sm font-medium text-bg">
        Continue Learning
      </Link>
    );
  }
  if (access === 'guest') {
    return (
      <Link href={`/login?next=/courses/${course.slug}`} className="block rounded-md border border-border-strong px-3 py-2 text-center text-sm font-medium text-text">
        Log in to enroll
      </Link>
    );
  }
  if (access === 'enrollable_free' && course.productId) {
    return (
      <Link href={`/dashboard/checkout/${course.productId}`} className="block rounded-md bg-neon px-3 py-2 text-center text-sm font-medium text-bg">
        Enroll for free
      </Link>
    );
  }
  if (course.productId) {
    return (
      <Link href={`/dashboard/checkout/${course.productId}`} className="block rounded-md bg-neon px-3 py-2 text-center text-sm font-medium text-bg">
        Buy Course
      </Link>
    );
  }
  return null;
}

export default function CourseCard({ course, access = 'guest' }: { course: PublicCourseCard; access?: CourseAccessState }) {
  const hasDiscount = course.saleAmount != null && course.priceAmount != null && course.saleAmount < course.priceAmount;
  const isFree = course.priceAmount === 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-bg-elevated">
      <Link href={`/courses/${course.slug}`} className="block aspect-video w-full overflow-hidden bg-surface">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-entered external URL, not a static/optimizable asset
          <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">No thumbnail</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/courses/${course.slug}`} className="font-medium leading-snug text-text hover:text-neon">
          {course.title}
        </Link>
        {course.instructorName && <p className="text-xs text-text-muted">By {course.instructorName}</p>}
        <p className="text-xs text-text-muted">
          {LEVEL_LABEL[course.level] ?? course.level}
          {course.moduleCount > 0 && ` · ${course.moduleCount} module${course.moduleCount === 1 ? '' : 's'}`}
          {course.lessonCount > 0 && ` · ${course.lessonCount} lesson${course.lessonCount === 1 ? '' : 's'}`}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-2">
          {isFree ? (
            <span className="text-sm font-medium text-neon">Free</span>
          ) : course.priceAmount != null ? (
            <>
              <span className="text-sm font-medium text-neon">{formatAmount(hasDiscount ? course.saleAmount! : course.priceAmount, course.currencyCode)}</span>
              {hasDiscount && <span className="text-xs text-text-muted line-through">{formatAmount(course.priceAmount, course.currencyCode)}</span>}
            </>
          ) : null}
        </div>

        <CourseCta course={course} access={access} />
      </div>
    </article>
  );
}
