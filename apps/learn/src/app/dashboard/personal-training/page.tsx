import Link from 'next/link';
import { getSessionUser } from '@/lib/auth/session';
import { getMyProfile } from '@/lib/student/data';
import { listMyTrainingRequests } from '@/lib/personalTraining';
import { submitPersonalTrainingRequest } from './actions';

function formatAmount(amountMinorUnits: number, currencyCode: string): string {
  return `${currencyCode} ${(amountMinorUnits / 100).toLocaleString()}`;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Submitted — awaiting review',
  reviewing: 'Being reviewed',
  contacted: "We've reached out to you",
  approved: 'Price agreed — ready to accept',
  declined: 'Declined',
  converted: 'Accepted — booking in progress',
};

export default async function PersonalTrainingDashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [profile, requests] = await Promise.all([getMyProfile(user.id), listMyTrainingRequests(user.id)]);

  const hasOpenRequest = requests.some((r) => !['declined', 'converted'].includes(r.status));

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Personal Training</h1>
        <p className="mt-1 text-sm text-text-muted">
          Instructor-led training arranged around your own goals and schedule. Submitting a request never charges you anything — pricing and
          scheduling are discussed and agreed with you before anything is booked.
        </p>
      </div>

      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted">Your requests</h2>
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.areaOfInterest}</span>
                <span className="text-xs text-text-muted">{STATUS_LABEL[r.status] ?? r.status}</span>
              </div>
              {r.status === 'approved' && r.agreedPriceAmount != null && r.agreedCurrencyCode && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-bg-elevated/60 p-3">
                  <span>
                    Agreed price: <strong>{formatAmount(r.agreedPriceAmount, r.agreedCurrencyCode)}</strong>
                  </span>
                  <Link href={`/dashboard/personal-training/${r.id}/accept`} className="rounded-md bg-neon px-3 py-1.5 text-xs font-medium text-bg">
                    Accept &amp; pay
                  </Link>
                </div>
              )}
              {r.status === 'converted' && (
                <p className="mt-2 text-xs text-text-muted">
                  Accepted —{' '}
                  <Link href="/dashboard/orders" className="text-neon hover:underline">
                    view it in your orders
                  </Link>
                  .
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasOpenRequest && (
        <form action={submitPersonalTrainingRequest} className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold">Request Personal Training</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted" htmlFor="contactName">
                Name
              </label>
              <input
                id="contactName"
                name="contactName"
                defaultValue={profile?.fullName ?? ''}
                required
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted" htmlFor="contactEmail">
                Email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={profile?.email ?? ''}
                required
                className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="areaOfInterest">
              What area do you want training in?
            </label>
            <input id="areaOfInterest" name="areaOfInterest" required placeholder="e.g. Web application penetration testing" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="experienceLevel">
              Your experience level
            </label>
            <select id="experienceLevel" name="experienceLevel" defaultValue="beginner" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="goals">
              Your goals
            </label>
            <textarea id="goals" name="goals" required rows={3} placeholder="What do you want to be able to do after this training?" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="formatPreference">
              Format (optional)
            </label>
            <select id="formatPreference" name="formatPreference" defaultValue="no_preference" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2">
              <option value="no_preference">No preference</option>
              <option value="one_on_one">1:1</option>
              <option value="group">Group</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="preferredAvailability">
              Preferred availability (optional)
            </label>
            <input id="preferredAvailability" name="preferredAvailability" placeholder="e.g. Weekday evenings, PKT" className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm text-text-muted" htmlFor="specialRequest">
              Anything else you'd like us to know? (optional)
            </label>
            <textarea id="specialRequest" name="specialRequest" rows={2} className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2" />
          </div>

          <p className="text-xs text-text-muted">Submitting this request never charges you anything. We'll follow up to discuss scope and pricing.</p>

          <button type="submit" className="w-full rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Submit request
          </button>
        </form>
      )}
    </div>
  );
}
