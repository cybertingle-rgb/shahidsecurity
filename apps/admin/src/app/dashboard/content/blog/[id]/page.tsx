import { notFound } from 'next/navigation';
import { getBlogPostById, getTagNamesForPost, getFaqsForPost, formatFaqsAsText } from '@/lib/blog';
import { isGitHubPublishConfigured } from '@/lib/github/client';
import { listPublicationsForContent } from '@/lib/publish/publications';
import {
  updateBlogPost,
  publishBlogPost,
  unpublishBlogPost,
  scheduleBlogPost,
  deleteBlogPost,
  publishBlogPostToLiveSite,
  refreshBlogPublicationStatus,
  rollbackBlogPostPublication,
} from '../actions';

const STATUS_LABEL: Record<string, string> = {
  publishing: 'Publishing…',
  building: 'Building & deploying…',
  deploying: 'Deploying…',
  published: 'Published',
  failed: 'Failed',
};

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getBlogPostById(id);
  if (!post) notFound();

  const [tags, faqs, publications] = await Promise.all([
    getTagNamesForPost(id),
    getFaqsForPost(id),
    listPublicationsForContent('blog_post', id),
  ]);
  const githubConfigured = isGitHubPublishConfigured();

  const boundUpdate = updateBlogPost.bind(null, id);
  const publish = publishBlogPost.bind(null, id);
  const unpublish = unpublishBlogPost.bind(null, id);
  const schedule = scheduleBlogPost.bind(null, id);
  const remove = deleteBlogPost.bind(null, id);
  const publishToLiveSite = publishBlogPostToLiveSite.bind(null, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{post.title}</h1>
        <span className="text-sm text-text-muted">
          {post.status}
          {post.status === 'scheduled' && post.scheduledFor ? ` — ${post.scheduledFor.toLocaleString()}` : ''}
        </span>
      </div>

      <form action={boundUpdate} className="space-y-4 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <FieldInput label="Title" name="title" defaultValue={post.title} required />
        <FieldTextarea label="Description" name="description" rows={2} defaultValue={post.description ?? ''} />
        <FieldTextarea label="Body (Markdown)" name="bodyMarkdown" rows={16} defaultValue={post.bodyMarkdown ?? ''} />
        <FieldInput label="Related service slug" name="relatedServiceSlug" defaultValue={post.relatedServiceSlug ?? ''} />
        <FieldInput label="Tags (comma-separated)" name="tags" defaultValue={tags.join(', ')} />
        <FieldTextarea label="FAQs" name="faqs" rows={6} defaultValue={formatFaqsAsText(faqs)} />
        <FieldInput label="SEO title" name="seoTitle" defaultValue={post.seoTitle ?? ''} />
        <FieldTextarea label="SEO description" name="seoDescription" rows={2} defaultValue={post.seoDescription ?? ''} />
        <button type="submit" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          Save
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        {post.status === 'published' ? (
          <form action={unpublish}>
            <button type="submit" className="rounded-md border border-warn px-4 py-2 text-sm text-warn">
              Unpublish
            </button>
          </form>
        ) : (
          <form action={publish}>
            <button type="submit" className="rounded-md border border-neon px-4 py-2 text-sm text-neon">
              Publish now
            </button>
          </form>
        )}
        {post.status !== 'published' && (
          <form action={schedule} className="flex items-center gap-2">
            <input
              type="datetime-local"
              name="scheduledFor"
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
              defaultValue={post.scheduledFor ? post.scheduledFor.toISOString().slice(0, 16) : ''}
            />
            <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm text-text-muted">
              Schedule
            </button>
          </form>
        )}
        {post.status === 'draft' && (
          <form action={remove}>
            <button type="submit" className="rounded-md border border-danger px-4 py-2 text-sm text-danger">
              Delete draft
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-bg-elevated/60 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Live website</h2>
          <form action={publishToLiveSite}>
            <button
              type="submit"
              disabled={!githubConfigured}
              aria-disabled={!githubConfigured}
              className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg disabled:cursor-not-allowed disabled:opacity-40"
            >
              Publish to shahidiqbal.com
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
          <p className="text-sm text-text-muted">Never published to the live site.</p>
        ) : (
          <ul className="divide-y divide-border">
            {publications.map((pub) => {
              const refresh = refreshBlogPublicationStatus.bind(null, pub.id);
              const rollback = rollbackBlogPostPublication.bind(null, pub.id);
              return (
                <li key={pub.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className={pub.status === 'failed' ? 'text-danger' : pub.status === 'published' ? 'text-neon' : 'text-warn'}>
                        {STATUS_LABEL[pub.status] ?? pub.status}
                      </span>
                      {' — '}
                      {pub.createdAt.toLocaleString()}
                    </p>
                    {pub.commitSha && (
                      <p className="font-mono text-xs text-text-muted">commit {pub.commitSha.slice(0, 10)}</p>
                    )}
                    {pub.errorMessage && <p className="text-xs text-danger">{pub.errorMessage}</p>}
                  </div>
                  <div className="flex gap-2">
                    {(pub.status === 'building' || pub.status === 'deploying' || pub.status === 'publishing') && (
                      <form action={refresh}>
                        <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted">
                          Refresh status
                        </button>
                      </form>
                    )}
                    {pub.status === 'published' && pub.previousCommitSha && (
                      <form action={rollback}>
                        <button type="submit" className="rounded-md border border-warn px-3 py-1.5 text-xs text-warn">
                          Revert to before this publish
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FieldInput({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-neon focus:outline-none"
      />
    </div>
  );
}

function FieldTextarea({ label, name, rows, defaultValue }: { label: string; name: string; rows: number; defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-muted" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono focus:border-neon focus:outline-none"
      />
    </div>
  );
}
