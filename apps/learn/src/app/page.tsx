import Link from 'next/link';
import Image from 'next/image';
import EduBackground from '@/components/EduBackground';
import CourseCard from '@/components/CourseCard';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';
import { listCatalogCourses, listCourseCategories, getCourseAccessStates } from '@/lib/public/courses';
import { listPurchasableProducts } from '@/lib/checkout';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

export default async function HomePage() {
  const user = await getSessionUser();
  const isAdmin = user ? [...(await getUserRoleNames(user.id))].some((r) => ADMIN_ROLE_NAMES.has(r)) : false;

  const [courses, categories, membershipProducts] = await Promise.all([listCatalogCourses(), listCourseCategories(), listPurchasableProducts()]);

  const accessByCourseId = await getCourseAccessStates(user?.id ?? null, courses);
  const coursesWithAccess = courses.map((c) => ({ course: c, access: accessByCourseId.get(c.id)! }));
  const featuredWithAccess = coursesWithAccess.filter((c) => c.course.featured);
  const membership = membershipProducts.find((p) => p.type === 'membership');

  return (
    <div className="relative min-h-screen text-text">
      <EduBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Shahid Security" width={36} height={36} />
          <span className="font-semibold">Learn with Shahid</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-text-muted hover:text-text">
            Home
          </Link>
          <Link href="/courses" className="text-text-muted hover:text-text">
            Browse Courses
          </Link>
          <a href="https://shahidiqbal.com/learn/roadmap" className="hidden text-text-muted hover:text-text sm:inline">
            Learning Roadmap
          </a>
          <Link href="/dashboard/membership" className="hidden text-text-muted hover:text-text sm:inline">
            Membership
          </Link>
          <a href="https://shahidiqbal.com/about" className="hidden text-text-muted hover:text-text sm:inline">
            About
          </a>
          <a href="https://shahidiqbal.com/contact" className="hidden text-text-muted hover:text-text sm:inline">
            Contact
          </a>
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-md bg-neon px-3 py-1.5 font-medium text-bg">
                Dashboard
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-neon hover:underline">
                  Admin panel
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="text-text-muted hover:text-text">
                Log in
              </Link>
              <Link href="/register" className="rounded-md bg-neon px-3 py-1.5 font-medium text-bg">
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 py-16 text-center">
        <h1 className="mx-auto max-w-2xl bg-gradient-to-r from-text to-neon-soft bg-clip-text text-3xl font-semibold text-transparent sm:text-4xl">
          Build Your Skills. Secure Your Future.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-text-muted">Learn cybersecurity through structured courses, practical exercises and expert-guided learning.</p>
        <div className="mt-6 flex justify-center gap-4">
          <Link href="/courses" className="rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
            Browse Courses
          </Link>
          <a href="https://shahidiqbal.com/learn/roadmap" className="rounded-md border border-border-strong px-5 py-2.5 font-medium text-text hover:border-neon">
            Explore Learning Roadmap
          </a>
        </div>
      </section>

      {/* Browse courses */}
      <section className="relative z-10 px-6 py-12">
        <h2 className="text-2xl font-semibold">Explore Our Courses</h2>
        <p className="mt-1 text-text-muted">Real courses, built and maintained by a working security consultant — not a generic catalog.</p>

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-4">
            {categories.map((c) => (
              <span key={c} className="rounded-full border border-border-strong px-3 py-1 text-xs text-text-muted">
                {c}
              </span>
            ))}
          </div>
        )}

        {coursesWithAccess.length === 0 ? (
          <p className="mt-8 text-text-muted">No courses published yet — check back soon.</p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {coursesWithAccess.map(({ course, access }) => (
              <CourseCard key={course.id} course={course} access={access} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/courses" className="text-sm font-medium text-neon hover:underline">
            View all courses →
          </Link>
        </div>
      </section>

      {/* Featured */}
      {featuredWithAccess.length > 0 && (
        <section className="relative z-10 px-6 py-12">
          <h2 className="text-2xl font-semibold">Featured Courses</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredWithAccess.map(({ course, access }) => (
              <CourseCard key={course.id} course={course} access={access} />
            ))}
          </div>
        </section>
      )}

      {/* Membership */}
      {membership && (
        <section className="relative z-10 px-6 py-12">
          <div className="mx-auto max-w-lg rounded-lg border border-border bg-bg-elevated p-6 text-center">
            <h2 className="text-xl font-semibold">{membership.name}</h2>
            {membership.description && <p className="mt-2 text-sm text-text-muted">{membership.description}</p>}
            <p className="mt-4 text-lg font-medium text-neon">{formatAmount(membership.price.amount, membership.price.currencyCode)}</p>
            <Link href={user ? '/dashboard/membership' : '/register'} className="mt-4 inline-block rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
              {user ? 'View membership' : 'Get started'}
            </Link>
          </div>
        </section>
      )}

      <footer className="relative z-10 border-t border-border px-6 py-8 text-center text-sm text-text-muted">
        <p>
          Learn with Shahid is the education arm of{' '}
          <a href="https://shahidiqbal.com" className="text-neon hover:underline">
            Shahid Security
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
