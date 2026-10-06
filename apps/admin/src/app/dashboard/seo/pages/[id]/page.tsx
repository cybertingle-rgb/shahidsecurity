import { notFound } from 'next/navigation';
import { getSeoPageById } from '@/lib/seo';
import { isGitHubPublishConfigured } from '@/lib/github/client';
import { listPublicationsForContent } from '@/lib/publish/publications';
import { updateSeoPageOverride, deleteSeoPageOverride, publishSeoOverride } from '../../actions';

export default async function EditSeoPageOverride({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const override = await getSeoPageById(id);
  if (!override) notFound();

  const publications = await listPublicationsForContent('seo_page', id);
  const githubConfigured = isGitHubPublishConfigured();

  const boundUpdate = updateSeoPageOverride.bind(null, id);
  const remove = deleteSeoPageOverride.bind(null, id);
  const publish = publishSeoOverride.bind(null, id);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{override.path}</h1>
      <form action={boundUpdate} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <Field label="Title override" name="title" defaultValue={override.title ?? ''} />
        <Field label="Description override" name="description" defaultValue={override.description ?? ''} />
        <Field label="Canonical URL" name="canonicalUrl" defaultValue={override.canonicalUrl ?? ''} />
        <Field label="Robots directive" name="robotsDirective" defaultValue={override.robotsDirective ?? ''} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>
      <form action={remove}>
        <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
          Delete override
        </button>
      </form>

      <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Live website</h2>
          <form action={publish}>
            <button
              type="submit"
              disabled={!githubConfigured}
              aria-disabled={!githubConfigured}
              className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Publish override to shahidiqbal.com
            </button>
          </form>
        </div>
        {!githubConfigured && (
          <p className="text-sm text-warn">
            Publishing to the live site isn&apos;t configured yet (GITHUB_TOKEN and related env vars). See{' '}
            <code>docs/CONTENT_PUBLISHING.md</code>.
          </p>
        )}
        {publications.length === 0 ? (
          <p className="text-sm text-text-muted">This override has never been published to the live site — saving it above only updates the admin panel&apos;s own record.</p>
        ) : (
          <ul className="divide-y divide-border">
            {publications.map((pub) => (
              <li key={pub.id} className="py-2 text-sm">
                <span className={pub.status === 'failed' ? 'text-danger' : pub.status === 'published' ? 'text-neon' : 'text-warn'}>
                  {pub.status}
                </span>
                {' — '}
                {pub.createdAt.toLocaleString()}
                {pub.errorMessage && <p className="text-xs text-danger">{pub.errorMessage}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}
