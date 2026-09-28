import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCommunity, listCommunityMembers } from '@/lib/admin/communities';
import { markInvited, markJoined } from '../actions';

const STATUS_LABEL: Record<string, string> = {
  not_eligible: 'Not eligible',
  eligible: 'Eligible — needs invite',
  invitation_pending: 'Invite pending',
  invited: 'Invited',
  joined: 'Joined',
  revoked: 'Revoked',
};

export default async function CommunityMembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const community = await getCommunity(id);
  if (!community) notFound();

  const members = await listCommunityMembers(id);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/communities" className="text-sm text-neon">
        ← Back to communities
      </Link>
      <h1 className="text-2xl font-semibold">{community.name}</h1>
      <p className="text-sm text-text-muted">
        Invite link (never shown to a student until they're marked "Invited"):{' '}
        <a href={community.url} target="_blank" rel="noreferrer" className="text-neon">
          {community.url}
        </a>
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <p>{m.studentName}</p>
                  <p className="text-xs text-text-muted">{m.studentEmail}</p>
                </td>
                <td className="px-4 py-2 text-text-muted">{STATUS_LABEL[m.status] ?? m.status}</td>
                <td className="px-4 py-2 space-x-2">
                  {m.status === 'eligible' && (
                    <form action={markInvited.bind(null, m.id, id)} className="inline">
                      <button type="submit" className="text-sm text-neon">
                        Mark invited
                      </button>
                    </form>
                  )}
                  {m.status === 'invited' && (
                    <form action={markJoined.bind(null, m.id, id)} className="inline">
                      <button type="submit" className="text-sm text-neon">
                        Mark joined
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                  No one is eligible for this community yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
