import Link from '@/learn-core/_compat/link';
import type { PublicCourseCard, CourseAccessState } from '@/learn-core/lib/public/courses';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

// Each level gets its own small accent so the badge reads at a glance in a
// dense grid, without introducing a new color outside the site's own
// violet/amber/danger/warn token set.
const LEVEL_ACCENT: Record<string, string> = {
  beginner: 'text-success border-success/40 bg-success/10',
  intermediate: 'text-neon-soft border-neon-soft/40 bg-neon-soft/10',
  advanced: 'text-warn border-warn/40 bg-warn/10',
  expert: 'text-danger border-danger/40 bg-danger/10',
};

function ModuleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0">
      <path d="M2 3.5h12M2 8h12M2 12.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function LessonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0">
      <path d="M5.5 3.2v9.6L12.5 8 5.5 3.2Z" fill="currentColor" />
    </svg>
  );
}

function CourseCta({ course, access }: { course: PublicCourseCard; access: CourseAccessState }) {
  const base = 'block rounded-lg px-3 py-2 text-center text-xs font-semibold tracking-wide transition-colors';
  if (access === 'owned') {
    return (
      <Link href={`/dashboard/courses/${course.id}`} className={`${base} bg-neon text-bg hover:bg-neon-soft`}>
        Continue learning
      </Link>
    );
  }
  if (access === 'guest') {
    return (
      <Link
        href={`/login?next=/courses/${course.slug}`}
        className={`${base} border border-border-strong text-text hover:border-neon hover:text-neon-soft`}
      >
        Log in to enroll
      </Link>
    );
  }
  if (access === 'enrollable_free' && course.productId) {
    return (
      <Link href={`/dashboard/checkout/${course.productId}`} className={`${base} bg-neon text-bg hover:bg-neon-soft`}>
        Enroll for free
      </Link>
    );
  }
  if (course.productId) {
    return (
      <Link href={`/dashboard/checkout/${course.productId}`} className={`${base} bg-neon text-bg hover:bg-neon-soft`}>
        Buy course
      </Link>
    );
  }
  return null;
}

export default function CourseCard({ course, access = 'guest' }: { course: PublicCourseCard; access?: CourseAccessState }) {
  const hasDiscount = course.saleAmount != null && course.priceAmount != null && course.saleAmount < course.priceAmount;
  const isFree = course.priceAmount === 0;
  const levelAccent = LEVEL_ACCENT[course.level] ?? 'text-text-muted border-border-strong bg-surface';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated/70 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neon/50 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)]">
      <Link href={`/courses/${course.slug}`} className="relative block aspect-[16/10] w-full overflow-hidden bg-surface">
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-entered external URL, not a static/optimizable asset
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[0.7rem] text-text-muted">No thumbnail</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
        {course.featured && (
          <span className="absolute left-2 top-2 rounded-full bg-success px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-bg">
            Featured
          </span>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${levelAccent}`}
        >
          {LEVEL_LABEL[course.level] ?? course.level}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {course.category && <p className="font-mono text-[0.62rem] uppercase tracking-wider text-neon-soft">{course.category}</p>}

        <Link href={`/courses/${course.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-text transition-colors group-hover:text-neon-soft">
          {course.title}
        </Link>

        {course.shortDescription && <p className="line-clamp-2 text-xs leading-relaxed text-text-muted">{course.shortDescription}</p>}

        <div className="mt-0.5 flex items-center gap-2.5 text-[0.68rem] text-text-muted">
          {course.moduleCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <ModuleIcon />
              {course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}
            </span>
          )}
          {course.lessonCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <LessonIcon />
              {course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {course.instructorName && <p className="text-[0.68rem] text-text-muted">By {course.instructorName}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <div className="flex items-baseline gap-1.5">
            {isFree ? (
              <span className="text-sm font-bold text-neon-soft">Free</span>
            ) : course.priceAmount != null ? (
              <>
                <span className="text-sm font-bold text-neon-soft">
                  {formatAmount(hasDiscount ? course.saleAmount! : course.priceAmount, course.currencyCode)}
                </span>
                {hasDiscount && <span className="text-[0.65rem] text-text-muted line-through">{formatAmount(course.priceAmount, course.currencyCode)}</span>}
              </>
            ) : null}
          </div>
        </div>

        <CourseCta course={course} access={access} />
      </div>
    </article>
  );
}
