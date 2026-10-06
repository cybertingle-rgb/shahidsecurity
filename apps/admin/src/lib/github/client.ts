import { Octokit } from '@octokit/rest';

/**
 * Server-side-only GitHub client — never imported by any client
 * component, never returns a token to the browser. Needs exactly
 * `contents:write` on the one target repository; nothing broader. See
 * docs/CONTENT_PUBLISHING.md for how to create that credential
 * (a fine-grained PAT or a GitHub App installation token) and exactly
 * which permission to grant.
 *
 * `GITHUB_TOKEN` works for either: a fine-grained PAT used directly, or
 * a GitHub App's short-lived installation token refreshed by whatever
 * process owns that App (this function doesn't do App-token minting
 * itself — see docs/CONTENT_PUBLISHING.md for the App option's setup).
 */
export function isGitHubPublishConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME && process.env.GITHUB_REPO_BRANCH);
}

export function getGitHubRepoConfig() {
  return {
    owner: process.env.GITHUB_REPO_OWNER ?? '',
    repo: process.env.GITHUB_REPO_NAME ?? '',
    branch: process.env.GITHUB_REPO_BRANCH ?? '',
  };
}

let cachedClient: Octokit | null = null;

export function getOctokit(): Octokit {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN is not configured — cannot publish to the public site. See docs/CONTENT_PUBLISHING.md.');
  }
  if (!cachedClient) {
    cachedClient = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
  return cachedClient;
}
