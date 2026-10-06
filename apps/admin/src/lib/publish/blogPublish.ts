import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { blogPosts, blogAuthors, blogPostRelations, type Publication } from '@/db/schema';
import { getTagNamesForPost, getFaqsForPost } from '@/lib/blog';
import { renderBlogPostMdx, type BlogPostForRender } from './renderBlogPost';
import { isGitHubPublishConfigured } from '@/lib/github/client';
import { commitFile, restoreFileToCommit, getBranchHeadSha } from '@/lib/github/contents';
import { findWorkflowRunForCommit, mapWorkflowRunToPublicationStatus } from '@/lib/github/workflowStatus';
import { createPublication, updatePublication, getLastPublishedPublication, getPublicationById } from './publications';
import { logAudit } from '@/lib/audit';
import { PublishNotConfiguredError, PublicationNotFoundError } from './errors';

/**
 * Joins everything renderBlogPostMdx needs out of the database. Cover
 * images aren't wired up yet — no blog post currently uses one, and
 * committing the binary file alongside the .mdx needs its own
 * base64-safe commit path and real-repo verification before it ships;
 * tracked as a follow-up rather than half-built here.
 */
async function assembleRenderInput(postId: string): Promise<{ post: typeof blogPosts.$inferSelect; renderInput: BlogPostForRender }> {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
  if (!post) throw new Error('Post not found.');

  let authorName = 'Shahid Iqbal';
  if (post.authorId) {
    const [author] = await db.select().from(blogAuthors).where(eq(blogAuthors.id, post.authorId)).limit(1);
    if (author) authorName = author.name;
  }

  const tags = await getTagNamesForPost(postId);
  const faqRows = await getFaqsForPost(postId);
  const faqs = faqRows.map((f) => ({ question: f.question, answer: f.answer }));

  const relatedRows = await db
    .select({ slug: blogPosts.slug })
    .from(blogPostRelations)
    .innerJoin(blogPosts, eq(blogPostRelations.relatedPostId, blogPosts.id))
    .where(eq(blogPostRelations.postId, postId));
  const relatedPostSlugs = relatedRows.map((r) => r.slug);

  return {
    post,
    renderInput: {
      slug: post.slug,
      title: post.title,
      description: post.description ?? '',
      bodyMarkdown: post.bodyMarkdown ?? '',
      publishedAt: post.publishedAt ?? new Date(),
      updatedAt: post.updatedAt ?? null,
      authorName,
      tags,
      relatedServiceSlug: post.relatedServiceSlug,
      relatedPostSlugs,
      faqs,
      draft: false,
      cover: null,
    },
  };
}

/**
 * Publishes one blog post to the live Astro site: renders it to the
 * exact .mdx shape the content collection expects, commits it on the
 * deploy branch, and records the attempt in `publications`. Returns the
 * publication row so the caller (a Server Action) can redirect/revalidate
 * around it; never silently succeeds when GitHub isn't configured — see
 * docs/CONTENT_PUBLISHING.md.
 */
export async function publishBlogPostToWebsite(postId: string, actorUserId: string): Promise<Publication> {
  if (!isGitHubPublishConfigured()) {
    throw new PublishNotConfiguredError(
      'Publishing to the live website is not configured yet (GITHUB_TOKEN/GITHUB_REPO_OWNER/GITHUB_REPO_NAME/GITHUB_REPO_BRANCH). See docs/CONTENT_PUBLISHING.md.',
    );
  }

  const { post, renderInput } = await assembleRenderInput(postId);
  const publication = await createPublication({
    contentType: 'blog_post',
    contentId: postId,
    targetSlugOrPath: post.slug,
    publishedByUserId: actorUserId,
  });

  try {
    const { fileContent, filePath } = renderBlogPostMdx(renderInput);
    const previousCommitSha = await getBranchHeadSha();
    const { commitSha } = await commitFile(filePath, fileContent, `Publish blog post: ${post.title}`);

    await updatePublication(publication.id, { status: 'building', commitSha, previousCommitSha });
    await logAudit({
      actorUserId,
      action: 'BLOG_PUBLISHED',
      targetType: 'blog_post',
      targetId: postId,
      metadata: { publicationId: publication.id, commitSha, slug: post.slug },
    });

    return (await getPublicationById(publication.id)) ?? publication;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during publish.';
    await updatePublication(publication.id, { status: 'failed', errorMessage });
    await logAudit({
      actorUserId,
      action: 'DEPLOYMENT_FAILED',
      targetType: 'blog_post',
      targetId: postId,
      metadata: { publicationId: publication.id, errorMessage },
    });
    throw err;
  }
}

/**
 * Re-checks a publication that's still 'building' against the real
 * GitHub Actions run for its commit and updates its status to match —
 * called from the admin UI's "Refresh status" action, never assumed.
 */
export async function refreshPublicationStatus(publicationId: string): Promise<Publication> {
  const publication = await getPublicationById(publicationId);
  if (!publication) throw new PublicationNotFoundError('Publication not found.');
  if (!publication.commitSha || publication.status === 'published' || publication.status === 'failed') {
    return publication;
  }

  const run = await findWorkflowRunForCommit(publication.commitSha);
  if (!run) return publication;

  const status = mapWorkflowRunToPublicationStatus(run);
  await updatePublication(publicationId, {
    status,
    workflowRunId: String(run.runId),
    errorMessage: status === 'failed' ? `GitHub Actions run failed — see ${run.htmlUrl}` : null,
  });

  if (status === 'published') {
    await logAudit({ actorUserId: publication.publishedByUserId, action: 'DEPLOYMENT_SUCCEEDED', targetType: 'blog_post', targetId: publication.contentId, metadata: { publicationId } });
  } else if (status === 'failed') {
    await logAudit({ actorUserId: publication.publishedByUserId, action: 'DEPLOYMENT_FAILED', targetType: 'blog_post', targetId: publication.contentId, metadata: { publicationId } });
  }

  return (await getPublicationById(publicationId)) ?? publication;
}

/**
 * Restores the live site's file for this publication back to whatever it
 * was immediately before that publish — the previous production build
 * stays intact until the new commit's own workflow run finishes, so a
 * rollback is itself just another real, auditable commit.
 */
export async function rollbackBlogPublication(publicationId: string, actorUserId: string): Promise<Publication> {
  if (!isGitHubPublishConfigured()) {
    throw new PublishNotConfiguredError('Publishing to the live website is not configured — nothing to roll back via GitHub.');
  }

  const publication = await getPublicationById(publicationId);
  if (!publication) throw new PublicationNotFoundError('Publication not found.');
  if (publication.contentType !== 'blog_post') {
    throw new Error('This publication is not a blog post — use the SEO rollback path for an seo_page publication.');
  }
  if (!publication.previousCommitSha) {
    throw new Error('This publication has no recorded previous commit to roll back to.');
  }

  // The file path is deterministic from the slug alone — restoring
  // historical content doesn't need (and must not depend on) the
  // current draft re-validating, since that draft may have changed for
  // unrelated reasons since this publication succeeded.
  const filePath = `src/content/blog/${publication.targetSlugOrPath}.mdx`;
  const { commitSha } = await restoreFileToCommit(filePath, publication.previousCommitSha, `Rollback: ${publication.targetSlugOrPath}`);

  const rollbackPublication = await createPublication({
    contentType: 'blog_post',
    contentId: publication.contentId,
    targetSlugOrPath: publication.targetSlugOrPath,
    publishedByUserId: actorUserId,
  });
  await updatePublication(rollbackPublication.id, { status: 'building', commitSha, previousCommitSha: publication.commitSha });

  await logAudit({
    actorUserId,
    action: 'DEPLOYMENT_ROLLBACK',
    targetType: 'blog_post',
    targetId: publication.contentId,
    metadata: { rolledBackPublicationId: publicationId, newPublicationId: rollbackPublication.id, restoredCommitSha: commitSha },
  });

  return (await getPublicationById(rollbackPublication.id)) ?? rollbackPublication;
}

export { getLastPublishedPublication };
