import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts, blogCategories, blogTags, blogPostTags, blogPostFaqs, type BlogPost } from '@/db/schema';

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCategories() {
  return db.select().from(blogCategories).orderBy(blogCategories.name);
}

export async function getTagNamesForPost(postId: string): Promise<string[]> {
  const rows = await db
    .select({ name: blogTags.name })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, postId));
  return rows.map((r) => r.name);
}

export async function getFaqsForPost(postId: string) {
  return db.select().from(blogPostFaqs).where(eq(blogPostFaqs.postId, postId)).orderBy(blogPostFaqs.sortOrder);
}

/**
 * Parses a comma-separated tag list, creating any tag that doesn't
 * already exist (matched case-insensitively by slug), and replaces the
 * post's full tag set with exactly this list.
 */
export async function setPostTags(postId: string, rawTagList: string): Promise<void> {
  const names = rawTagList
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const tagIds: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    const [existing] = await db.select({ id: blogTags.id }).from(blogTags).where(eq(blogTags.slug, slug));
    if (existing) {
      tagIds.push(existing.id);
    } else {
      const id = crypto.randomUUID();
      await db.insert(blogTags).values({ id, slug, name });
      tagIds.push(id);
    }
  }

  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ postId, tagId })));
  }
}

/** Parses "Q: ...\nA: ...\n\nQ: ...\nA: ..." blocks into FAQ rows and replaces the post's full FAQ set. */
export async function setPostFaqs(postId: string, rawFaqText: string): Promise<void> {
  const blocks = rawFaqText
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const parsed: Array<{ question: string; answer: string }> = [];
  for (const block of blocks) {
    const qMatch = block.match(/^Q:\s*(.+)$/m);
    const aMatch = block.match(/^A:\s*(.+)$/m);
    const question = qMatch?.[1]?.trim();
    const answer = aMatch?.[1]?.trim();
    if (question && answer) {
      parsed.push({ question, answer });
    }
  }

  await db.delete(blogPostFaqs).where(eq(blogPostFaqs.postId, postId));
  if (parsed.length > 0) {
    await db.insert(blogPostFaqs).values(
      parsed.map((faq, index) => ({ id: crypto.randomUUID(), postId, question: faq.question, answer: faq.answer, sortOrder: index })),
    );
  }
}

export function formatFaqsAsText(faqs: Array<{ question: string; answer: string }>): string {
  return faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
}

/**
 * Flips any 'scheduled' post whose scheduledFor time has passed to
 * 'published'. Called from the secret-gated /api/internal/publish-
 * scheduled route, which needs an external trigger (Hostinger's hPanel
 * Cron Jobs feature, pointed at this endpoint on a schedule, e.g. every
 * 15 minutes) to actually run — see docs/BLOG_CMS.md. Returns the ids
 * published in this run.
 */
export async function publishDuePosts(): Promise<string[]> {
  const due = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(and(eq(blogPosts.status, 'scheduled'), lte(blogPosts.scheduledFor, new Date())));

  const ids = due.map((row) => row.id);
  for (const id of ids) {
    await db.update(blogPosts).set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() }).where(eq(blogPosts.id, id));
  }
  return ids;
}

export async function listAllTagsForPosts(postIds: string[]): Promise<Map<string, string[]>> {
  if (postIds.length === 0) return new Map();
  const rows = await db
    .select({ postId: blogPostTags.postId, name: blogTags.name })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(inArray(blogPostTags.postId, postIds));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push(row.name);
    map.set(row.postId, list);
  }
  return map;
}
