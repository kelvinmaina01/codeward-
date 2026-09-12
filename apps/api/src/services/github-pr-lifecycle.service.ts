import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { repositories, runs } from '../db/schema.js';
import { getInstallationOctokit } from '../lib/github.js';
import { renderGuardianStatusComment } from '../agents/guardian/github-renderer.js';

/** One idempotent GitHub surface per Codeward run: a Check Run plus an editable status comment. */
export async function startPrLifecycle(runId: number, estimatedDurationSeconds = 180) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run?.repoId || !run.prNumber) return { skipped: true };
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, run.repoId));
  if (!repo?.installationId) return { skipped: true, reason: 'missing GitHub installation' };
  const octokit = await getInstallationOctokit(repo.installationId);
  let checkRunId = run.githubCheckRunId;
  let statusCommentId = run.githubStatusCommentId;
  if (!checkRunId) {
    const check: any = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
      owner: repo.owner, repo: repo.name, name: 'Codeward · Review', head_sha: run.commitSha,
      status: 'in_progress', started_at: new Date().toISOString(),
      output: { title: 'Codeward review in progress', summary: 'Preparing an isolated review sandbox and routing the relevant agents.' },
    });
    checkRunId = check.data.id;
  }
  if (!statusCommentId) {
    const comment: any = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: repo.owner, repo: repo.name, issue_number: run.prNumber,
      body: renderGuardianStatusComment({ repoFullName: repo.fullName, commitSha: run.commitSha, estimatedDurationSeconds }),
    });
    statusCommentId = comment.data.id;
  }
  await db.update(runs).set({ githubCheckRunId: checkRunId, githubStatusCommentId: statusCommentId }).where(eq(runs.id, runId));
  return { checkRunId, statusCommentId };
}

export async function completePrLifecycle(runId: number, params: { conclusion: 'success' | 'failure' | 'neutral'; title: string; summary: string }) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run?.repoId || !run.prNumber) return { skipped: true };
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, run.repoId));
  if (!repo?.installationId) return { skipped: true };
  const octokit = await getInstallationOctokit(repo.installationId);
  if (run.githubCheckRunId) await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
    owner: repo.owner, repo: repo.name, check_run_id: run.githubCheckRunId, status: 'completed', conclusion: params.conclusion,
    completed_at: new Date().toISOString(), output: { title: params.title, summary: params.summary.slice(0, 65000) },
  });
  if (run.githubStatusCommentId) await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
    owner: repo.owner, repo: repo.name, comment_id: run.githubStatusCommentId,
    body: `## Codeward review complete\n\n${params.summary}\n\n<sub>Run #${run.id} · \`${run.commitSha.slice(0, 7)}\` · [Open Dashboard](${process.env.FRONTEND_URL || 'https://codeward.cloud'}/dashboard/issues-prs?tab=prs)</sub>`,
  });
  return { completed: true };
}
