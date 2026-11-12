import type { Metadata } from 'next';
import Link from '@/learn-core/_compat/link';
import EduBackground from '@/learn-core/components/EduBackground';
import PublicHeader from '@/learn-core/components/PublicHeader';
import SocialRail from '@/learn-core/components/SocialRail';
import CourseCard from '@/learn-core/components/CourseCard';
import { getSessionUser } from '@/learn-core/lib/auth/session';
import { listCatalogCourses, listCourseCategories, getCourseAccessStates } from '@/learn-core/lib/public/courses';

export const metadata: Metadata = {
  title: 'Course Catalog',
  description: 'Browse every published cybersecurity course from Learn with Shahid — structured lessons, quizzes, and progress tracking, free and paid.',
  alternates: { canonical: '/courses' },
};

export default async function CoursesCatalogPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const user = await getSessionUser();

  const [allCourses, categories] = await Promise.all([listCatalogCourses(), listCourseCategories()]);
  const filtered = category ? allCourses.filter((c) => c.category === category) : allCourses;
  const accessByCourseId = await getCourseAccessStates(user?.id ?? null, filtered);
  const withAccess = filtered.map((c) => ({ course: c, access: accessByCourseId.get(c.id)! }));

  return (
    <div className="relative min-h-screen text-text">
      <EduBackground />
      <PublicHeader />
      <SocialRail />
      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:pl-28">
        <p className="font-mono text-xs uppercase tracking-wider text-neon-soft">// catalog</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Browse courses</h1>
        <p className="mt-1.5 text-sm text-text-muted">
          {withAccess.length} course{withAccess.length === 1 ? '' : 's'}
          {category ? ` in ${category}` : ' across every track'} — structured lessons, quizzes, and progress tracking.
        </p>

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-5">
            <Link
              href="/courses"
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                !category ? 'border-neon bg-neon-dim text-neon-soft' : 'border-border-strong text-text-muted hover:border-neon/50 hover:text-text'
              }`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/courses?category=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === c ? 'border-neon bg-neon-dim text-neon-soft' : 'border-border-strong text-text-muted hover:border-neon/50 hover:text-text'
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {withAccess.length === 0 ? (
          <p className="mt-8 text-text-muted">No courses found.</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {withAccess.map(({ course, access }) => (
              <CourseCard key={course.id} course={course} access={access} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-border bg-bg-elevated/40 p-6 text-center backdrop-blur-sm">
          <h2 className="text-lg font-semibold">Don't see what you're after?</h2>
          <p className="mt-1 text-sm text-text-muted">Personal Training is instructor-led and arranged around your own goals — not a fixed course.</p>
          <Link href="/personal-training" className="mt-4 inline-block rounded-md border border-neon px-4 py-2 text-sm font-medium text-neon-soft transition-colors hover:bg-neon-dim">
            Request Personal Training
          </Link>
        </div>
      </div>
    </div>
  );
}
