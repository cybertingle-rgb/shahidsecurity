import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import SocialRail from '@/components/SocialRail';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Personal Training',
  description:
    'Instructor-led cybersecurity training with Shahid Iqbal, arranged around your own goals, skill level, and schedule — not a prerecorded course. Pricing and scheduling are discussed with you before anything is booked.',
  alternates: { canonical: '/personal-training' },
};

const INCLUDED_POINTS = [
  'Built around the topics, skill level, and goals you tell us about — not a fixed syllabus.',
  'Direct, instructor-led sessions with Shahid Iqbal, not a prerecorded video course.',
  'Pricing and scheduling are discussed and agreed with you first — nothing is charged when you submit a request.',
];

export default async function PersonalTrainingPage() {
  const user = await getSessionUser();
  const requestHref = user ? '/dashboard/personal-training' : '/login?redirect=%2Fdashboard%2Fpersonal-training';

  return (
    <div className="min-h-screen text-text">
      <PublicHeader />
      <SocialRail />
      <div className="mx-auto max-w-3xl px-6 py-12 lg:pl-28">
        <p className="text-sm font-medium text-neon">A second way to learn</p>
        <h1 className="mt-1 text-3xl font-semibold">Personal Training</h1>
        <p className="mt-4 text-text-muted">
          Alongside our structured courses, Personal Training is instructor-led cybersecurity training arranged around your own interests, skill
          level, and goals. It isn't prerecorded, and it isn't sold at a fixed price — tell us what you're after, and Shahid will reach out to
          discuss scope, scheduling, and pricing with you directly before anything is booked.
        </p>

        <ul className="mt-6 space-y-3">
          {INCLUDED_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-text-muted">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-lg border border-border bg-bg-elevated/40 p-4 text-sm text-text-muted">
          <strong className="text-text">No price is shown here on purpose.</strong> Personal Training isn't a catalog item with a fixed cost —
          pricing depends on scope and schedule, and you'll see and agree to a specific price before anything is booked or charged. Submitting a
          request never charges you anything.
        </div>

        <div className="mt-8">
          <Link href={requestHref} className="rounded-md bg-neon px-5 py-2.5 font-medium text-bg">
            Request Personal Training
          </Link>
        </div>
      </div>
    </div>
  );
}
