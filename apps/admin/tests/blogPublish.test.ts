import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { testDb, schema, truncateAll, closeTestDb } from './testDb';

vi.mock('@/lib/github/client', () => ({
  isGitHubPublishConfigured: vi.fn(() => true),
  getGitHubRepoConfig: () => ({ owner: 'test-owner', repo: 'test-repo', branch: 'main' }),
  getOctokit: () => { throw new Error('getOctokit should never be called directly in these tests — contents.ts is mocked.'); },
}));

vi.mock('@/lib/github/contents', () => ({
  getBranchHeadSha: vi.fn(async () => 'previous0000000000000000000000000000000'),
  commitFile: vi.fn(async () => ({ commitSha: 'new00000000000000000000000000000000000' })),
  restoreFileToCommit: vi.fn(async () => ({ commitSha: 'rollback00000000000000000000000000000' })),
  getExistingFile: vi.fn(async () => null),
  deleteFile: vi.fn(async () => null),
}));

vi.mock('@/lib/github/workflowStatus', () => ({
  findWorkflowRunForCommit: vi.fn(async () => null),
  mapWorkflowRunToPublicationStatus: vi.fn(() => 'published'),
}));

const githubClient = await import('@/lib/github/client');
const githubContents = await import('@/lib/github/contents');
const workflowStatus = await import('@/lib/github/workflowStatus');
const { publishBlogPostToWebsite, refreshPublicationStatus, rollbackBlogPublication } = await import('@/lib/publish/blogPublish');
const { PublishNotConfiguredError } = await import('@/lib/publish/errors');

afterAll(closeTestDb);

async function makeAdminUser() {
  const id = crypto.randomUUID();
  await testDb.insert(schema.adminUsers).values({ id, email: `${id}@test.local`, passwordHash: 'x', fullName: 'Test Admin' });
  return id;
}

async function makePost(overrides: Partial<typeof schema.blogPosts.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  await testDb.insert(schema.blogPosts).values({
    id,
    slug: `post-${id.slice(0, 8)}`,
    title: 'A Real Post Title',
    description: 'A real description for this post.',
    bodyMarkdown: '## Heading\n\nSome real body content.',
    status: 'published',
    publishedAt: new Date('2026-01-01'),
    ...overrides,
  });
  return id;
}

describe('publishBlogPostToWebsite', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.mocked(githubClient.isGitHubPublishConfigured).mockReturnValue(true);
    vi.mocked(githubContents.commitFile).mockResolvedValue({ commitSha: 'new00000000000000000000000000000000000' });
  });

  it('throws without touching GitHub when publishing isn\'t configured', async () => {
    vi.mocked(githubClient.isGitHubPublishConfigured).mockReturnValue(false);
    const userId = await makeAdminUser();
    const postId = await makePost();

    await expect(publishBlogPostToWebsite(postId, userId)).rejects.toThrow(PublishNotConfiguredError);
    expect(githubContents.commitFile).not.toHaveBeenCalled();
  });

  it('creates a published-track publications row with the real commit SHA on success', async () => {
    const userId = await makeAdminUser();
    const postId = await makePost();

    const publication = await publishBlogPostToWebsite(postId, userId);

    expect(publication.status).toBe('building');
    expect(publication.commitSha).toBe('new00000000000000000000000000000000000');
    expect(publication.previousCommitSha).toBe('previous0000000000000000000000000000000');
    expect(publication.contentType).toBe('blog_post');
    expect(publication.contentId).toBe(postId);

    const auditRows = await testDb.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, 'BLOG_PUBLISHED'));
    expect(auditRows).toHaveLength(1);
  });

  it('marks the publication failed and leaves no commit recorded when GitHub rejects the commit', async () => {
    vi.mocked(githubContents.commitFile).mockRejectedValueOnce(new Error('GitHub API error: 403'));
    const userId = await makeAdminUser();
    const postId = await makePost();

    await expect(publishBlogPostToWebsite(postId, userId)).rejects.toThrow('GitHub API error: 403');

    const rows = await testDb.select().from(schema.publications).where(eq(schema.publications.contentId, postId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('failed');
    expect(rows[0]?.errorMessage).toContain('403');
    expect(rows[0]?.commitSha).toBeNull();

    const auditRows = await testDb.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, 'DEPLOYMENT_FAILED'));
    expect(auditRows).toHaveLength(1);
  });

  it('rejects a post with an empty title before ever calling GitHub', async () => {
    const userId = await makeAdminUser();
    const postId = await makePost({ title: '' });

    await expect(publishBlogPostToWebsite(postId, userId)).rejects.toThrow();
    expect(githubContents.commitFile).not.toHaveBeenCalled();
  });
});

describe('refreshPublicationStatus', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.mocked(workflowStatus.findWorkflowRunForCommit).mockResolvedValue(null);
  });

  it('leaves the publication unchanged when no matching workflow run is found yet', async () => {
    const userId = await makeAdminUser();
    const postId = await makePost();
    const publication = await publishBlogPostToWebsite(postId, userId);

    const refreshed = await refreshPublicationStatus(publication.id);
    expect(refreshed.status).toBe('building');
  });

  it('updates status to published once the real workflow run succeeds', async () => {
    vi.mocked(workflowStatus.findWorkflowRunForCommit).mockResolvedValue({
      runId: 42,
      status: 'completed',
      conclusion: 'success',
      htmlUrl: 'https://github.com/test-owner/test-repo/actions/runs/42',
    });
    vi.mocked(workflowStatus.mapWorkflowRunToPublicationStatus).mockReturnValue('published');

    const userId = await makeAdminUser();
    const postId = await makePost();
    const publication = await publishBlogPostToWebsite(postId, userId);

    const refreshed = await refreshPublicationStatus(publication.id);
    expect(refreshed.status).toBe('published');
    expect(refreshed.workflowRunId).toBe('42');

    const succeeded = await testDb.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, 'DEPLOYMENT_SUCCEEDED'));
    expect(succeeded).toHaveLength(1);
  });
});

describe('rollbackBlogPublication', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.mocked(githubContents.restoreFileToCommit).mockResolvedValue({ commitSha: 'rollback00000000000000000000000000000' });
  });

  it('creates a new publication that restores the previous commit', async () => {
    const userId = await makeAdminUser();
    const postId = await makePost();
    const original = await publishBlogPostToWebsite(postId, userId);

    const rollback = await rollbackBlogPublication(original.id, userId);

    expect(rollback.id).not.toBe(original.id);
    expect(rollback.commitSha).toBe('rollback00000000000000000000000000000');
    expect(rollback.previousCommitSha).toBe(original.commitSha);
    expect(githubContents.restoreFileToCommit).toHaveBeenCalledWith(
      `src/content/blog/${original.targetSlugOrPath}.mdx`,
      original.previousCommitSha,
      expect.any(String),
    );

    const rollbackAudit = await testDb.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, 'DEPLOYMENT_ROLLBACK'));
    expect(rollbackAudit).toHaveLength(1);
  });

  it('refuses to roll back a publication with no recorded previous commit', async () => {
    const userId = await makeAdminUser();
    const postId = await makePost();
    const id = crypto.randomUUID();
    await testDb.insert(schema.publications).values({
      id,
      contentType: 'blog_post',
      contentId: postId,
      targetSlugOrPath: 'some-slug',
      status: 'published',
      commitSha: 'abc',
      publishedByUserId: userId,
    });

    await expect(rollbackBlogPublication(id, userId)).rejects.toThrow(/no recorded previous commit/);
  });

  it('refuses to roll back an seo_page publication through the blog rollback path', async () => {
    const userId = await makeAdminUser();
    const id = crypto.randomUUID();
    await testDb.insert(schema.publications).values({
      id,
      contentType: 'seo_page',
      contentId: crypto.randomUUID(),
      targetSlugOrPath: '/about/',
      status: 'published',
      commitSha: 'abc',
      previousCommitSha: 'def',
      publishedByUserId: userId,
    });

    await expect(rollbackBlogPublication(id, userId)).rejects.toThrow(/not a blog post/);
    expect(githubContents.restoreFileToCommit).not.toHaveBeenCalled();
  });
});
