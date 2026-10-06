import { getOctokit, getGitHubRepoConfig } from './client';

/** Returns the current commit SHA at the tip of the target branch — the "previous commit" a publish records for rollback. */
export async function getBranchHeadSha(): Promise<string> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getGitHubRepoConfig();
  const res = await octokit.repos.getBranch({ owner, repo, branch });
  return res.data.commit.sha;
}

/** Returns the existing file's blob SHA (needed to update it) and decoded content, or null if it doesn't exist yet. */
export async function getExistingFile(path: string): Promise<{ sha: string; content: string } | null> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getGitHubRepoConfig();
  try {
    const res = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(res.data) || res.data.type !== 'file') {
      throw new Error(`${path} is not a regular file in the repo.`);
    }
    return { sha: res.data.sha, content: Buffer.from(res.data.content, 'base64').toString('utf8') };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return null;
    throw err;
  }
}

/**
 * Creates or updates one file with a single real commit on the target
 * branch — the same push `.github/workflows/deploy.yml` already
 * watches and already builds safely (build failure blocks the deploy
 * step; see docs/ADMIN_PUBLIC_SITE_INTEGRATION.md). Returns the real
 * commit SHA GitHub assigned, which is what the admin UI shows as
 * "Published commit" and what a rollback would revert to.
 */
export async function commitFile(path: string, content: string, message: string): Promise<{ commitSha: string }> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getGitHubRepoConfig();

  const existing = await getExistingFile(path);
  const res = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    sha: existing?.sha,
  });

  const commitSha = res.data.commit.sha;
  if (!commitSha) throw new Error('GitHub did not return a commit SHA for this publish.');
  return { commitSha };
}

/** Restores a file to exactly the content it had in a previous commit — used by rollback. */
export async function restoreFileToCommit(path: string, previousCommitSha: string, message: string): Promise<{ commitSha: string }> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getGitHubRepoConfig();

  const historical = await octokit.repos.getContent({ owner, repo, path, ref: previousCommitSha });
  if (Array.isArray(historical.data) || historical.data.type !== 'file') {
    throw new Error(`${path} was not a regular file at commit ${previousCommitSha}.`);
  }

  const current = await getExistingFile(path);
  const res = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message,
    content: historical.data.content,
    sha: current?.sha,
  });

  const commitSha = res.data.commit.sha;
  if (!commitSha) throw new Error('GitHub did not return a commit SHA for this rollback.');
  return { commitSha };
}

/** Permanently removes a file with a real commit — used when unpublishing a post that should no longer exist on the live site. */
export async function deleteFile(path: string, message: string): Promise<{ commitSha: string } | null> {
  const octokit = getOctokit();
  const { owner, repo, branch } = getGitHubRepoConfig();

  const existing = await getExistingFile(path);
  if (!existing) return null;

  const res = await octokit.repos.deleteFile({ owner, repo, path, branch, message, sha: existing.sha });
  const commitSha = res.data.commit.sha;
  if (!commitSha) throw new Error('GitHub did not return a commit SHA for this delete.');
  return { commitSha };
}
