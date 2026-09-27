import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-6 text-center text-text">
      <Image src="/learn-logo.png" alt="Learn with Shahid" width={96} height={96} className="rounded-full" priority />
      <div>
        <h1 className="text-2xl font-semibold">Learn with Shahid</h1>
        <p className="mt-2 max-w-md text-text-muted">
          The student and admin application. The public course catalog, roadmap, and pricing pages live on{' '}
          <span className="text-neon">shahidiqbal.com/learn</span> — this app is for logged-in students and admins.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/login" className="rounded-md bg-neon px-4 py-2 font-medium text-bg">
          Log in
        </Link>
        <Link href="/register" className="rounded-md border border-border-strong px-4 py-2 font-medium text-text">
          Register
        </Link>
      </div>
    </div>
  );
}
