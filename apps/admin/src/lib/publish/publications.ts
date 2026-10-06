import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { publications, type Publication } from '@/db/schema';

export async function createPublication(input: {
  contentType: 'blog_post' | 'seo_page';
  contentId: string;
  targetSlugOrPath: string;
  publishedByUserId: string;
}): Promise<Publication> {
  const id = crypto.randomUUID();
  await db.insert(publications).values({
    id,
    contentType: input.contentType,
    contentId: input.contentId,
    targetSlugOrPath: input.targetSlugOrPath,
    status: 'publishing',
    publishedByUserId: input.publishedByUserId,
  });
  const [created] = await db.select().from(publications).where(eq(publications.id, id)).limit(1);
  if (!created) throw new Error('Failed to read back the created publication row.');
  return created;
}

export async function updatePublication(
  id: string,
  fields: Partial<Pick<Publication, 'status' | 'commitSha' | 'previousCommitSha' | 'workflowRunId' | 'errorMessage'>>,
): Promise<void> {
  await db.update(publications).set({ ...fields, updatedAt: new Date() }).where(eq(publications.id, id));
}

export async function getPublicationById(id: string): Promise<Publication | null> {
  const rows = await db.select().from(publications).where(eq(publications.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Most recent publish attempts for one content item, newest first — the history shown in the admin UI. */
export async function listPublicationsForContent(contentType: 'blog_post' | 'seo_page', contentId: string): Promise<Publication[]> {
  return db
    .select()
    .from(publications)
    .where(and(eq(publications.contentType, contentType), eq(publications.contentId, contentId)))
    .orderBy(desc(publications.createdAt));
}

/** The most recent publish attempt that actually succeeded — what a rollback for this content would restore if this one fails. */
export async function getLastPublishedPublication(contentType: 'blog_post' | 'seo_page', contentId: string): Promise<Publication | null> {
  const rows = await listPublicationsForContent(contentType, contentId);
  return rows.find((r) => r.status === 'published') ?? null;
}
