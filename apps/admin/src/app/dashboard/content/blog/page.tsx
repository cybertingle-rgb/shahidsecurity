import Link from 'next/link';
import { listBlogPosts, listAllTagsForPosts } from '@/lib/blog';

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-text-muted',
  scheduled: 'text-warn',
  published: 'text-neon-soft',
};

export default async function BlogPostsPage() {
  const posts = await listBlogPosts();
  const tagsByPost = await listAllTagsForPosts(posts.map((p) => p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Blog posts</h1>
        <Link href="/dashboard/content/blog/new" className="rounded-md bg-neon px-4 py-2 text-sm font-medium text-bg">
          New post
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-text-muted">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <Link href={`/dashboard/content/blog/${p.id}`} className="text-neon">
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-text-muted">{(tagsByPost.get(p.id) ?? []).join(', ') || '—'}</td>
                <td className="px-4 py-2">
                  <span className={STATUS_COLOR[p.status]}>{p.status}</span>
                  {p.status === 'scheduled' && p.scheduledFor && (
                    <span className="ml-2 text-xs text-text-muted">{p.scheduledFor.toLocaleString()}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-text-muted">{p.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-text-muted">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
