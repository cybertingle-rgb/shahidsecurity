import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts, blogAuthors, blogPostRelations } from '@/db/schema';
import { setPostTags, setPostFaqs } from '@/lib/blog';
import legacyPosts from '@/db/legacy-blog-posts-data.json';

type LegacyPost = {
  slug: string;
  title: string;
  description: string;
  bodyMarkdown: string;
  publishedAt: string;
  updatedAt: string | null;
  tags: string[];
  author: string;
  draft: boolean;
  relatedService: string | null;
  relatedPosts: string[];
  faqs: { question: string; answer: string }[];
};

/**
 * One-time import of the 21 blog posts that already existed as .mdx
 * files in the Astro site's src/content/blog/ before this admin's Blog
 * CMS existed — those files are the live, published source of truth on
 * shahidiqbal.com already (this import never touches them or commits
 * anything to GitHub), but they had no corresponding row in this app's
 * own blog_posts table, so the CMS list showed nothing. The post data
 * was extracted once from the real .mdx frontmatter+body into
 * src/db/legacy-blog-posts-data.json (see git history for the one-off
 * extraction script) since this deployed app's root directory
 * (apps/admin) doesn't include the Astro site's src/content/ tree.
 * Idempotent — skips any slug that's already a row, so safe to call
 * more than once (e.g. if a new legacy post is ever added to the
 * dataset).
 */
export async function importLegacyBlogPosts(): Promise<{ imported: string[]; skipped: string[] }> {
  const posts = legacyPosts as LegacyPost[];
  const imported: string[] = [];
  const skipped: string[] = [];

  let [author] = await db.select().from(blogAuthors).where(eq(blogAuthors.name, 'Shahid Iqbal')).limit(1);
  if (!author) {
    const id = crypto.randomUUID();
    await db.insert(blogAuthors).values({ id, name: 'Shahid Iqbal' });
    [author] = await db.select().from(blogAuthors).where(eq(blogAuthors.id, id)).limit(1);
  }

  const slugToId = new Map<string, string>();

  for (const post of posts) {
    const [existing] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, post.slug)).limit(1);
    if (existing) {
      skipped.push(post.slug);
      slugToId.set(post.slug, existing.id);
      continue;
    }

    const id = crypto.randomUUID();
    const publishedAt = new Date(post.publishedAt);
    await db.insert(blogPosts).values({
      id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      bodyMarkdown: post.bodyMarkdown,
      authorId: author!.id,
      relatedServiceSlug: post.relatedService,
      status: post.draft ? 'draft' : 'published',
      publishedAt,
      createdAt: publishedAt,
      updatedAt: post.updatedAt ? new Date(post.updatedAt) : publishedAt,
    });

    if (post.tags.length > 0) await setPostTags(id, post.tags.join(', '));
    if (post.faqs.length > 0) await setPostFaqs(id, post.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n'));

    slugToId.set(post.slug, id);
    imported.push(post.slug);
  }

  // Second pass — relatedPosts can reference a post later in the file.
  for (const post of posts) {
    const postId = slugToId.get(post.slug);
    if (!postId || post.relatedPosts.length === 0) continue;
    for (const relatedSlug of post.relatedPosts) {
      const relatedId = slugToId.get(relatedSlug);
      if (!relatedId || relatedId === postId) continue;
      await db.insert(blogPostRelations).values({ postId, relatedPostId: relatedId }).onDuplicateKeyUpdate({ set: { postId } });
    }
  }

  return { imported, skipped };
}
