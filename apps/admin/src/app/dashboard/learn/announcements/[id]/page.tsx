import { notFound } from 'next/navigation';
import { getAnnouncement } from '@/lib/learn/announcements';
import { updateAnnouncement } from '../actions';

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const announcement = await getAnnouncement(id);
  if (!announcement) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Edit announcement</h1>

      <form action={updateAnnouncement.bind(null, id)} className="space-y-4 rounded-lg border border-border p-4">
        <div>
          <label className="block text-sm text-text-muted" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={announcement.title}
            required
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="body">
            Message
          </label>
          <textarea
            id="body"
            name="body"
            defaultValue={announcement.body}
            rows={4}
            required
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-text-muted" htmlFor="targetType">
            Audience
          </label>
          <select
            id="targetType"
            name="targetType"
            defaultValue={announcement.targetType}
            className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
          >
            <option value="all">Everyone</option>
            <option value="membership">Members only</option>
            <option value="course">A specific course (set from that course later)</option>
            <option value="group">A specific group</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          <input type="checkbox" name="sendEmail" defaultChecked={announcement.channels?.email ?? false} />
          Also send by email
        </label>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save changes
        </button>
      </form>
    </div>
  );
}
