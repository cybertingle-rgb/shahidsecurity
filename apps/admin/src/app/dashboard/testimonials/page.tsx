import Link from 'next/link';
import { listTestimonials } from '@/lib/testimonials';
import { createTestimonial, setTestimonialVerification, publishTestimonial, unpublishTestimonial, deleteTestimonial } from './actions';
import type { Testimonial } from '@/db/schema';

const VERIFICATION_COLOR: Record<string, string> = {
  verified: 'text-neon-soft',
  pending: 'text-warn',
  unverified: 'text-text-muted',
};

function TestimonialRow({ t }: { t: Testimonial }) {
  const boundVerify = setTestimonialVerification.bind(null, t.id);
  const publish = publishTestimonial.bind(null, t.id);
  const unpublish = unpublishTestimonial.bind(null, t.id);
  const remove = deleteTestimonial.bind(null, t.id);

  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-2">
        <p className="font-medium">{t.authorName}</p>
        <p className="mt-1 max-w-sm text-text-muted">&ldquo;{t.quote}&rdquo;</p>
        {t.sourceUrl && (
          <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-neon">
            source
          </a>
        )}
      </td>
      <td className="px-4 py-2">
        <form action={boundVerify} className="flex items-center gap-2">
          <select
            name="verificationStatus"
            defaultValue={t.verificationStatus}
            className={`rounded border border-border bg-bg px-2 py-1 text-xs ${VERIFICATION_COLOR[t.verificationStatus]}`}
          >
            <option value="pending">pending</option>
            <option value="verified">verified</option>
            <option value="unverified">unverified</option>
          </select>
          <button type="submit" className="text-xs text-text-muted underline">
            update
          </button>
        </form>
      </td>
      <td className="px-4 py-2">{t.status}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {t.status === 'published' ? (
            <form action={unpublish}>
              <button type="submit" className="text-xs text-warn underline">
                unpublish
              </button>
            </form>
          ) : (
            <form action={publish}>
              <button type="submit" className="text-xs text-neon underline">
                publish
              </button>
            </form>
          )}
          {t.status === 'draft' && (
            <form action={remove}>
              <button type="submit" className="text-xs text-danger underline">
                delete
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

export default async function TestimonialsPage() {
  const items = await listTestimonials();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Testimonials</h1>
        <Link href="/dashboard/testimonials/review-requests" className="text-sm text-neon">
          Review requests →
        </Link>
      </div>

      <form action={createTestimonial} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <h2 className="text-sm font-medium">Add a real testimonial</h2>
        <p className="text-xs text-text-muted">Only enter a quote a real client actually gave — this form has no fallback or placeholder content.</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-text-muted" htmlFor="authorName">
              Author name
            </label>
            <input id="authorName" name="authorName" required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-muted" htmlFor="sourceUrl">
              Source URL (optional — a public review link makes this auto-verified)
            </label>
            <input id="sourceUrl" name="sourceUrl" placeholder="https://g.page/..." className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="quote">
            Quote
          </label>
          <textarea id="quote" name="quote" rows={3} required className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add as draft
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Testimonial</th>
              <th className="px-4 py-2">Verification</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <TestimonialRow key={t.id} t={t} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No testimonials yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
