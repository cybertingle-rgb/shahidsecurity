import { getSessionUser } from '@/lib/auth/session';
import { getMyCommunities } from '@/lib/student/data';

const STATUS_LABEL: Record<string, string> = {
  not_eligible: 'Not yet eligible',
  eligible: "You're eligible — waiting for your invite",
  invitation_pending: 'Invite on the way',
  invited: 'Invited — join using the link below',
  joined: 'Joined',
  revoked: 'Access revoked',
};

export default async function CommunityPage() {
  const session = await getSessionUser();
  const communities = session ? await getMyCommunities(session.id) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Community</h1>

      {communities.length === 0 && <p className="text-text-muted">No communities available for your account yet.</p>}

      <div className="space-y-3">
        {communities.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{c.name}</p>
              <span className="text-xs text-text-muted">{c.platform}</span>
            </div>
            <p className="mt-1 text-sm text-text-muted">{STATUS_LABEL[c.accessStatus] ?? c.accessStatus}</p>
            {c.url && (
              <a href={c.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-neon">
                Open invite link
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
