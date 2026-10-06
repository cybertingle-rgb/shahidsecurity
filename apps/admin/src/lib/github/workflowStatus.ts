import { getOctokit, getGitHubRepoConfig } from './client';

export type WorkflowRunStatus = {
  runId: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  htmlUrl: string;
};

/**
 * Finds the real GitHub Actions run for a specific commit, by listing
 * runs for the deploy workflow and matching `head_sha` — this is how
 * the admin UI's publishing/building/deploying/published/failed status
 * is derived from GitHub's own real state, not guessed or simulated.
 */
export async function findWorkflowRunForCommit(commitSha: string, workflowFileName = 'deploy.yml'): Promise<WorkflowRunStatus | null> {
  const octokit = getOctokit();
  const { owner, repo } = getGitHubRepoConfig();

  const res = await octokit.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: workflowFileName,
    per_page: 20,
  });

  const run = res.data.workflow_runs.find((r) => r.head_sha === commitSha);
  if (!run) return null;

  return {
    runId: run.id,
    status: run.status as WorkflowRunStatus['status'],
    conclusion: run.conclusion as WorkflowRunStatus['conclusion'],
    htmlUrl: run.html_url,
  };
}

export async function getWorkflowRunById(runId: number): Promise<WorkflowRunStatus> {
  const octokit = getOctokit();
  const { owner, repo } = getGitHubRepoConfig();

  const res = await octokit.actions.getWorkflowRun({ owner, repo, run_id: runId });
  return {
    runId: res.data.id,
    status: res.data.status as WorkflowRunStatus['status'],
    conclusion: res.data.conclusion as WorkflowRunStatus['conclusion'],
    htmlUrl: res.data.html_url,
  };
}

/**
 * Maps a GitHub Actions run's real state onto this app's publication
 * status enum. `queued`/`in_progress` both show as 'building' — this
 * repo's workflow doesn't have a separate typecheck/build vs. deploy
 * job split (see docs/ADMIN_PUBLIC_SITE_INTEGRATION.md), so there's no
 * finer-grained real signal than "still running" to show.
 */
export function mapWorkflowRunToPublicationStatus(run: WorkflowRunStatus): 'building' | 'published' | 'failed' {
  if (run.status !== 'completed') return 'building';
  if (run.conclusion === 'success') return 'published';
  return 'failed';
}
