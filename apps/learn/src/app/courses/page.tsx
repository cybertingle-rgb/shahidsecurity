import Link from 'next/link';
import CourseCard from '@/components/CourseCard';
import { getSessionUser } from '@/lib/auth/session';
import { listCatalogCourses, listCourseCategories, getCourseAccessStates } from '@/lib/public/courses';

export default async function CoursesCatalogPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const user = await getSessionUser();

  const [allCourses, categories] = await Promise.all([listCatalogCourses(), listCourseCategories()]);
  const filtered = category ? allCourses.filter((c) => c.category === category) : allCourses;
  const accessByCourseId = await getCourseAccessStates(user?.id ?? null, filtered);
  const withAccess = filtered.map((c) => ({ course: c, access: accessByCourseId.get(c.id)! }));

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-text">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Courses</h1>
        <Link href="/" className="text-sm text-text-muted hover:text-text">
          ← Home
        </Link>
      </div>

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
    </div>
  );
}
