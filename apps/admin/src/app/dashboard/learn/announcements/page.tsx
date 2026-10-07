import Link from 'next/link';
import { listAnnouncements } from '@/lib/learn/announcements';
import ConfirmSubmitButton from '../_components/ConfirmSubmitButton';
import { createAnnouncement, deleteAnnouncement } from './actions';

export default async function LearnAnnouncementsPage() {
  const announcements = await listAnnouncements();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Announcements</h1>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <Link href={`/dashboard/learn/announcements/${a.id}`} className="font-medium hover:text-neon">
                {a.title}
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <p className="text-xs text-text-muted">
                  {a.targetType} — {a.publishedAt.toLocaleDateString()}
                </p>
                <Link href={`/dashboard/learn/announcements/${a.id}`} className="text-xs text-text-muted hover:text-text">
                  Edit
                </Link>
                <form action={deleteAnnouncement.bind(null, a.id)}>
                  <ConfirmSubmitButton confirmMessage={`Delete the announcement "${a.title}"? This cannot be undone.`} className="text-xs text-danger">
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
            <p className="mt-1 text-sm text-text-muted">{a.body}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-text-muted">No announcements yet.</p>}
      </div>

      <form action={createAnnouncement} className="space-y-4 rounded-lg border border-border p-4">
        <h2 className="text-lg font-semibold">New announcement</h2>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="title">
            Title
          </label>
          <input id="title" name="title" required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="body">
            Message
          </label>
          <textarea id="body" name="body" rows={4} required className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="targetType">
            Audience
          </label>
          <select id="targetType" name="targetType" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
            <option value="all">Everyone</option>
            <option value="membership">Members only</option>
            <option value="course">A specific course (set from that course later)</option>
            <option value="group">A specific group</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="sendEmail" />
          Also send by email
        </label>
        <p className="text-xs text-text-muted">
          Email delivery for announcements isn't wired up yet — this flag is recorded for when it is; today every announcement only appears on the dashboard.
        </p>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Publish announcement
        </button>
      </form>
    </div>
  );
}
