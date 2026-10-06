import { listReviewRequests } from '@/lib/testimonials';
import { listCustomers } from '@/lib/payments';
import { getOrCreateBusinessSettings } from '@/lib/business';
import { sendReviewRequest, markReviewRequestCompleted } from '../actions';

type ReviewRequestRow = Awaited<ReturnType<typeof listReviewRequests>>[number];

function ReviewRequestRowView({ request }: { request: ReviewRequestRow }) {
  const markCompleted = markReviewRequestCompleted.bind(null, request.id);
  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2">{request.customerName}</td>
      <td className="px-4 py-2 text-text-muted">{request.sentAt.toLocaleString()}</td>
      <td className="px-4 py-2">{request.status}</td>
      <td className="px-4 py-2">
        {request.status === 'sent' && (
          <form action={markCompleted}>
            <button type="submit" className="text-xs text-neon underline">
              mark completed
            </button>
          </form>
        )}
      </td>
    </tr>
  );
}

export default async function ReviewRequestsPage() {
  const [requests, customers, settings] = await Promise.all([listReviewRequests(), listCustomers(), getOrCreateBusinessSettings()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Review requests</h1>

      {!settings.googleReviewUrl ? (
        <p className="rounded-lg border border-warn/40 bg-warn/5 p-4 text-sm text-text-muted">
          No Google review link is set yet — add the business's real one on the <a href="/dashboard/business" className="text-neon">Business settings</a> page
          before sending requests. Nothing here will ever generate or guess one.
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-bg-elevated/60 p-4 text-sm">
          <p className="text-text-muted">Real Google review link on file:</p>
          <a href={settings.googleReviewUrl} target="_blank" rel="noreferrer" className="break-all text-neon">
            {settings.googleReviewUrl}
          </a>
          <p className="mt-2 text-xs text-text-muted">
            This app doesn&apos;t send the message itself yet — copy the link above and send it to the customer directly
            (email/WhatsApp), then record it below.
          </p>
        </div>
      )}

      {customers.length > 0 && settings.googleReviewUrl && (
        <form action={sendReviewRequest} className="flex items-end gap-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
          <div className="space-y-1">
            <label className="text-xs text-text-muted" htmlFor="customerId">
              Customer
            </label>
            <select id="customerId" name="customerId" required className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Record request sent
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Sent</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <ReviewRequestRowView key={r.id} request={r} />
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No review requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
