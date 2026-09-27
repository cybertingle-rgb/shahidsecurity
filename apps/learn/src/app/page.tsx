import Link from 'next/link';
import Image from 'next/image';
import EduBackground from '@/components/EduBackground';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center text-text">
      <EduBackground />
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-border-strong/60 bg-surface/60 px-8 py-10 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        <Image
          src="/learn-logo.png"
          alt="Learn with Shahid"
          width={96}
          height={96}
          className="rounded-full shadow-[0_0_30px_-4px_var(--color-neon)]"
          priority
        />
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-text to-neon-soft bg-clip-text text-transparent">Learn with Shahid</h1>
          <p className="mt-2 max-w-md text-text-muted">
            The student and admin application. The public course catalog, roadmap, and pricing pages live on{' '}
            <span className="text-neon">shahidiqbal.com/learn</span> — this app is for logged-in students and admins.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-neon px-4 py-2 font-medium text-bg shadow-[0_0_20px_-4px_var(--color-neon)] transition hover:shadow-[0_0_28px_-2px_var(--color-neon)]"
          >
            Log in
          </Link>
          <Link href="/register" className="rounded-md border border-border-strong px-4 py-2 font-medium text-text transition hover:border-neon">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
