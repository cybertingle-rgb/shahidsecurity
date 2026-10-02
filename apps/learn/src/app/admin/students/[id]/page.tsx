import { notFound } from 'next/navigation';
import { getStudentDetail, listEnrollableProducts, listPublishedCourses } from '@/lib/admin/students';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import { suspendStudent, reactivateStudent, manualEnroll, revokeEnrollment, updateStudentProfile } from '../actions';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const [products, courses] = await Promise.all([listEnrollableProducts(), listPublishedCourses()]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{detail.user.fullName}</h1>
          <p className="text-text-muted">{detail.user.email}</p>
          <p className="text-sm text-text-muted">Roles: {detail.roleNames.join(', ') || '—'}</p>
        </div>
        <form action={detail.user.status === 'active' ? suspendStudent.bind(null, id) : reactivateStudent.bind(null, id)}>
          {detail.user.status === 'active' ? (
            <ConfirmSubmitButton
              confirmMessage={`Suspend ${detail.user.fullName}'s account? They will be logged out immediately and unable to log back in until reactivated.`}
              className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger"
            >
              Suspend account
            </ConfirmSubmitButton>
          ) : (
            <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
              Reactivate account
            </button>
          )}
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form action={updateStudentProfile.bind(null, id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm text-text-muted" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={detail.user.fullName}
              required
              className="w-56 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={detail.user.email}
              required
              className="w-64 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted" htmlFor="countryCode">
              Country
            </label>
            <input
              id="countryCode"
              name="countryCode"
              defaultValue={detail.user.countryCode ?? ''}
              maxLength={2}
              placeholder="AE"
              className="w-20 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={detail.user.phone ?? ''}
              className="w-40 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Save profile
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Enrollments</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-muted">
              <tr>
                <th className="px-4 py-2">Course / Product</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Enrolled</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {detail.enrollments.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-2">{e.courseTitle ?? e.productName ?? '—'}</td>
                  <td className="px-4 py-2 text-text-muted">{e.source}</td>
                  <td className="px-4 py-2">{e.status}</td>
                  <td className="px-4 py-2 text-text-muted">{e.enrolledAt.toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {e.status === 'active' && (
                      <form action={revokeEnrollment.bind(null, e.id, id)}>
                        <ConfirmSubmitButton
                          confirmMessage={`Revoke ${detail.user.fullName}'s access to "${e.courseTitle ?? e.productName}"? They will lose access immediately.`}
                          className="text-sm text-danger"
                        >
                          Revoke
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {detail.enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-text-muted">
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={manualEnroll.bind(null, id)} className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
          <div>
            <label className="block text-sm text-text-muted">Course</label>
            <select name="courseId" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
              <option value="">—</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted">Product</label>
            <select name="productId" className="rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm">
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
            Grant manual enrollment
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Orders</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-text-muted">
              <tr>
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {detail.orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-2">{o.orderNumber}</td>
                  <td className="px-4 py-2">
                    {(o.amount / 100).toFixed(2)} {o.currencyCode}
                  </td>
                  <td className="px-4 py-2">{o.status}</td>
                  <td className="px-4 py-2 text-text-muted">{o.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {detail.orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-center text-text-muted">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
