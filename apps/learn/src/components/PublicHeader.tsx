import Link from 'next/link';
import Image from 'next/image';
import { getSessionUser } from '@/lib/auth/session';
import { getUserRoleNames } from '@/lib/rbac';

const ADMIN_ROLE_NAMES = new Set(['admin', 'super_admin']);

/**
 * Shared glass header for every public page (home, /courses, course
 * detail) — previously only the homepage had its own ad-hoc header
 * (plain flex row, just a bottom border) and the other public pages had
 * none at all. Reuses .portal-header (the same sticky glass treatment
 * the dashboard shell already uses) instead of a bespoke style, so the
 * public site and the logged-in portal read as one system.
 */
export default async function PublicHeader() {
  const user = await getSessionUser();
  const isAdmin = user ? [...(await getUserRoleNames(user.id))].some((r) => ADMIN_ROLE_NAMES.has(r)) : false;

  return (
    <header className="portal-header sticky top-0 z-20 flex items-center justify-between px-6 py-4">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="Shahid Security" width={36} height={36} />
        <span className="hidden font-semibold sm:inline">Learn with Shahid</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="hidden text-text-muted hover:text-text sm:inline">
          Home
        </Link>
        <Link href="/courses" className="text-text-muted hover:text-text">
          Browse Courses
        </Link>
        <Link href="/personal-training" className="text-text-muted hover:text-text">
          Personal Training
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
            <Link href="/dashboard" className="rounded-full bg-neon px-4 py-1.5 font-medium text-bg">
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
            <Link href="/register" className="rounded-full bg-neon px-4 py-1.5 font-medium text-bg">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
