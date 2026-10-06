'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { blogPosts } from '@/db/schema';
import { requireAdminAction } from '@/lib/guard';
import { logAudit } from '@/lib/audit';
import { slugify, getBlogPostById, setPostTags, setPostFaqs } from '@/lib/blog';
import { publishBlogPostToWebsite, refreshPublicationStatus, rollbackBlogPublication } from '@/lib/publish/blogPublish';

function readCommonFields(formData: FormData) {
  return {
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || null,
    bodyMarkdown: String(formData.get('bodyMarkdown') ?? '').trim() || null,
    relatedServiceSlug: String(formData.get('relatedServiceSlug') ?? '').trim() || null,
    seoTitle: String(formData.get('seoTitle') ?? '').trim() || null,
    seoDescription: String(formData.get('seoDescription') ?? '').trim() || null,
    tags: String(formData.get('tags') ?? ''),
    faqs: String(formData.get('faqs') ?? ''),
  };
}

export async function createBlogPost(formData: FormData) {
  const admin = await requireAdminAction('blog.manage');
  const fields = readCommonFields(formData);
  if (!fields.title) throw new Error('Title is required.');

  const id = crypto.randomUUID();
  let slug = slugify(fields.title);
  const [existing] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, slug));
  if (existing) slug = `${slug}-${id.slice(0, 8)}`;

  await db.insert(blogPosts).values({
    id,
    slug,
    title: fields.title,
    description: fields.description,
    bodyMarkdown: fields.bodyMarkdown,
    relatedServiceSlug: fields.relatedServiceSlug,
    seoTitle: fields.seoTitle,
    seoDescription: fields.seoDescription,
    status: 'draft',
    createdByUserId: admin.id,
  });

  await setPostTags(id, fields.tags);
  await setPostFaqs(id, fields.faqs);

  await logAudit({ actorUserId: admin.id, action: 'blog_post.created', targetType: 'blog_post', targetId: id, metadata: { title: fields.title } });
  redirect(`/dashboard/content/blog/${id}`);
}

export async function updateBlogPost(id: string, formData: FormData) {
  const admin = await requireAdminAction('blog.manage');
  const current = await getBlogPostById(id);
  if (!current) throw new Error('Post not found.');
  const fields = readCommonFields(formData);
  if (!fields.title) throw new Error('Title is required.');

  await db
    .update(blogPosts)
    .set({
      title: fields.title,
      description: fields.description,
      bodyMarkdown: fields.bodyMarkdown,
      relatedServiceSlug: fields.relatedServiceSlug,
      seoTitle: fields.seoTitle,
      seoDescription: fields.seoDescription,
      updatedAt: new Date(),
    })
    .where(eq(blogPosts.id, id));

  await setPostTags(id, fields.tags);
  await setPostFaqs(id, fields.faqs);

  await logAudit({ actorUserId: admin.id, action: 'blog_post.updated', targetType: 'blog_post', targetId: id });
  revalidatePath(`/dashboard/content/blog/${id}`);
}

export async function publishBlogPost(id: string) {
  const admin = await requireAdminAction('blog.manage');
  await db.update(blogPosts).set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() }).where(eq(blogPosts.id, id));
  await logAudit({ actorUserId: admin.id, action: 'blog_post.published', targetType: 'blog_post', targetId: id });
  revalidatePath(`/dashboard/content/blog/${id}`);
  revalidatePath('/dashboard/content/blog');
}

export async function unpublishBlogPost(id: string) {
  const admin = await requireAdminAction('blog.manage');
  await db.update(blogPosts).set({ status: 'draft', updatedAt: new Date() }).where(eq(blogPosts.id, id));
  await logAudit({ actorUserId: admin.id, action: 'blog_post.unpublished', targetType: 'blog_post', targetId: id });
  revalidatePath(`/dashboard/content/blog/${id}`);
  revalidatePath('/dashboard/content/blog');
}

export async function scheduleBlogPost(id: string, formData: FormData) {
  const admin = await requireAdminAction('blog.manage');
  const scheduledForRaw = String(formData.get('scheduledFor') ?? '');
  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;
  if (!scheduledFor || Number.isNaN(scheduledFor.getTime())) throw new Error('A valid schedule date/time is required.');
  if (scheduledFor.getTime() <= Date.now()) throw new Error('Scheduled time must be in the future.');

  await db.update(blogPosts).set({ status: 'scheduled', scheduledFor, updatedAt: new Date() }).where(eq(blogPosts.id, id));
  await logAudit({ actorUserId: admin.id, action: 'blog_post.scheduled', targetType: 'blog_post', targetId: id, metadata: { scheduledFor: scheduledFor.toISOString() } });
  revalidatePath(`/dashboard/content/blog/${id}`);
  revalidatePath('/dashboard/content/blog');
}

/**
 * Actually deploys this post to the live Astro site — distinct from
 * publishBlogPost above, which only flips this CMS's own draft/published
 * flag. Gated by a separate, narrower permission than blog.manage: not
 * every role that can edit posts should be able to push to production.
 * See docs/CONTENT_PUBLISHING.md.
 */
export async function publishBlogPostToLiveSite(id: string) {
  const admin = await requireAdminAction('content.publish');
  await publishBlogPostToWebsite(id, admin.id);
  revalidatePath(`/dashboard/content/blog/${id}`);
}

export async function refreshBlogPublicationStatus(publicationId: string) {
  await requireAdminAction('content.publish');
  const publication = await refreshPublicationStatus(publicationId);
  revalidatePath(`/dashboard/content/blog/${publication.contentId}`);
}

export async function rollbackBlogPostPublication(publicationId: string) {
  const admin = await requireAdminAction('deployment.rollback');
  const publication = await rollbackBlogPublication(publicationId, admin.id);
  revalidatePath(`/dashboard/content/blog/${publication.contentId}`);
}

/** Only a never-published draft can be hard-deleted — same archive-over-delete rule as services. */
export async function deleteBlogPost(id: string) {
  const admin = await requireAdminAction('blog.manage');
  const current = await getBlogPostById(id);
  if (!current) return;
  if (current.status !== 'draft') {
    throw new Error('Only a draft (never-published) post can be deleted. Unpublish it first if needed.');
  }

  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  await logAudit({ actorUserId: admin.id, action: 'blog_post.deleted', targetType: 'blog_post', targetId: id });
  revalidatePath('/dashboard/content/blog');
}
