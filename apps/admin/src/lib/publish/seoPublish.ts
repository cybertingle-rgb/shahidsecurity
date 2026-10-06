import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { seoPages, type Publication } from '@/db/schema';
import { buildSeoOverridesFile } from './renderSeoOverrides';
import { isGitHubPublishConfigured } from '@/lib/github/client';
import { getExistingFile, commitFile, getBranchHeadSha } from '@/lib/github/contents';
import { createPublication, updatePublication, getPublicationById } from './publications';
import { logAudit } from '@/lib/audit';
import { PublishNotConfiguredError } from './errors';

const SEO_OVERRIDES_PATH = 'src/data/seo-overrides.generated.json';

/**
 * Publishes one admin-edited SEO override (title/description/canonical/
 * robots for a specific path) to the live site by merging it into
 * seo-overrides.generated.json and committing it — the file
 * src/lib/seoOverrides.ts reads at build time. See
 * docs/ADMIN_PUBLIC_SITE_INTEGRATION.md for why this is a merge into one
 * generated file rather than a database read at request time.
 */
export async function publishSeoOverrideToWebsite(seoPageId: string, actorUserId: string): Promise<Publication> {
  if (!isGitHubPublishConfigured()) {
    throw new PublishNotConfiguredError(
      'Publishing to the live website is not configured yet (GITHUB_TOKEN/GITHUB_REPO_OWNER/GITHUB_REPO_NAME/GITHUB_REPO_BRANCH). See docs/CONTENT_PUBLISHING.md.',
    );
  }

  const [override] = await db.select().from(seoPages).where(eq(seoPages.id, seoPageId)).limit(1);
  if (!override) throw new Error('SEO override not found.');

  const publication = await createPublication({
    contentType: 'seo_page',
    contentId: seoPageId,
    targetSlugOrPath: override.path,
    publishedByUserId: actorUserId,
  });

  try {
    const existing = await getExistingFile(SEO_OVERRIDES_PATH);
    const newFileContent = buildSeoOverridesFile(existing?.content ?? '{"overrides":{}}', {
      path: override.path,
      title: override.title,
      description: override.description,
      canonicalUrl: override.canonicalUrl,
      robotsDirective: override.robotsDirective,
    });

    const previousCommitSha = await getBranchHeadSha();
    const { commitSha } = await commitFile(SEO_OVERRIDES_PATH, newFileContent, `Publish SEO override: ${override.path}`);

    await updatePublication(publication.id, { status: 'building', commitSha, previousCommitSha });
    await logAudit({
      actorUserId,
      action: 'SEO_PUBLISHED',
      targetType: 'seo_page',
      targetId: seoPageId,
      metadata: { publicationId: publication.id, commitSha, path: override.path },
    });

    return (await getPublicationById(publication.id)) ?? publication;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during publish.';
    await updatePublication(publication.id, { status: 'failed', errorMessage });
    await logAudit({
      actorUserId,
      action: 'DEPLOYMENT_FAILED',
      targetType: 'seo_page',
      targetId: seoPageId,
      metadata: { publicationId: publication.id, errorMessage },
    });
    throw err;
  }
}
