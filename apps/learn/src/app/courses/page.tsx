import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import SocialRail from '@/components/SocialRail';
import CourseCard from '@/components/CourseCard';
import { getSessionUser } from '@/lib/auth/session';
import { listCatalogCourses, listCourseCategories, getCourseAccessStates } from '@/lib/public/courses';

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
    <div className="min-h-screen text-text">
      <PublicHeader />
      <SocialRail />
      <div className="mx-auto max-w-6xl px-6 py-12 lg:pl-28">
        <h1 className="text-2xl font-semibold">All Courses</h1>

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
            <Link
              href="/courses"
              className={`rounded-full border px-3 py-1 text-xs ${!category ? 'border-neon text-neon' : 'border-border-strong text-text-muted'}`}
            >
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/courses?category=${encodeURIComponent(c)}`}
                className={`rounded-full border px-3 py-1 text-xs ${category === c ? 'border-neon text-neon' : 'border-border-strong text-text-muted'}`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}

        {withAccess.length === 0 ? (
          <p className="mt-8 text-text-muted">No courses found.</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {withAccess.map(({ course, access }) => (
              <CourseCard key={course.id} course={course} access={access} />
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-border bg-bg-elevated/40 p-6 text-center">
          <h2 className="text-lg font-semibold">Don't see what you're after?</h2>
          <p className="mt-1 text-sm text-text-muted">Personal Training is instructor-led and arranged around your own goals — not a fixed course.</p>
          <Link href="/personal-training" className="mt-4 inline-block rounded-md border border-neon px-4 py-2 text-sm font-medium text-neon">
            Request Personal Training
          </Link>
        </div>
      </div>
    </div>
  );
}
