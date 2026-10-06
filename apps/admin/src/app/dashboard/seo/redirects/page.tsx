import { listSeoRedirects } from '@/lib/seo';
import { createSeoRedirect, deleteSeoRedirect } from '../actions';

export default async function SeoRedirectsPage() {
  const redirects = await listSeoRedirects();

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Redirects</h1>
      <p className="text-sm text-text-muted">
        Same not-yet-wired-to-the-live-site caveat as per-page overrides — these are recorded here, but the Astro site's
        own public/.htaccess is still the live redirect source until a build step is added to generate it from this table.
      </p>

      <form action={createSeoRedirect} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-bg-elevated/60 p-4">
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="fromPath">
            From path
          </label>
          <input id="fromPath" name="fromPath" placeholder="/old-page/" required className="rounded-md border border-border bg-bg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="toUrl">
            To URL
          </label>
          <input id="toUrl" name="toUrl" placeholder="https://shahidiqbal.com/new-page/" required className="w-64 rounded-md border border-border bg-bg px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-text-muted" htmlFor="statusCode">
            Status
          </label>
          <select id="statusCode" name="statusCode" className="rounded-md border border-border bg-bg px-3 py-2 text-sm">
            <option value="301">301 (permanent)</option>
            <option value="302">302 (temporary)</option>
          </select>
        </div>
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Add
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">From</th>
              <th className="px-4 py-2">To</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {redirects.map((r) => {
              const remove = deleteSeoRedirect.bind(null, r.id);
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">{r.fromPath}</td>
                  <td className="px-4 py-2 text-text-muted">{r.toUrl}</td>
                  <td className="px-4 py-2 text-text-muted">{r.statusCode}</td>
                  <td className="px-4 py-2">
                    <form action={remove}>
                      <button type="submit" className="text-danger">
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {redirects.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No redirects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
