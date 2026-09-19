import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { repositories, runs } from '../db/schema.js';
import { getInstallationOctokit } from '../lib/github.js';
import {
  renderGuardianStatusComment,
  buildDispatchOutput,
  buildCompletionOutput,
} from '../agents/guardian/github-renderer.js';

/** One idempotent GitHub surface per Codeward run: a Check Run plus an editable status comment. */
export async function startPrLifecycle(runId: number, estimatedDurationSeconds = 180) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run?.repoId || !run.prNumber) return { skipped: true };
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, run.repoId));
  if (!repo?.installationId) return { skipped: true, reason: 'missing GitHub installation' };
  const octokit = await getInstallationOctokit(repo.installationId);
  let checkRunId = run.githubCheckRunId;
  let statusCommentId = run.githubStatusCommentId;

  const baseUrl = (process.env.FRONTEND_URL || 'https://www.codeward.cloud').replace(/\/+$/, '');
  const runUrl = `${baseUrl}/dashboard/livefeed?runId=${run.id}`;
  const agentsConfig = (repo?.config as any)?.agents;
  const dispatchedAgentIds = (run?.scope as any)?.dispatchedAgents;

  if (!checkRunId) {
    const dispatch = buildDispatchOutput({
      runId: run.id,
      repoFullName: repo.fullName,
      agentsConfig,
      dispatchedAgentIds,
      estimatedDurationSeconds,
    });
    const check: any = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
      owner: repo.owner,
      repo: repo.name,
      name: '🛡️ Codeward',
      head_sha: run.commitSha,
      details_url: runUrl,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      output: {
        title: dispatch.title,
        summary: dispatch.summary,
        text: dispatch.text,
      },
    });
    checkRunId = check.data.id;
  }

  if (!statusCommentId) {
    const comment: any = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: repo.owner,
      repo: repo.name,
      issue_number: run.prNumber,
      body: renderGuardianStatusComment({
        repoFullName: repo.fullName,
        commitSha: run.commitSha,
        estimatedDurationSeconds,
        runId: run.id,
        agentsConfig,
        dispatchedAgentIds,
      }),
    });
    statusCommentId = comment.data.id;
  }

  await db.update(runs).set({ githubCheckRunId: checkRunId, githubStatusCommentId: statusCommentId }).where(eq(runs.id, runId));
  return { checkRunId, statusCommentId };
}

export async function completePrLifecycle(
  runId: number,
  params: {
    conclusion: 'success' | 'failure' | 'neutral';
    title: string;
    summary: string;
    findings?: Array<{ severity: string }>;
  }
) {
  const [run] = await db.select().from(runs).where(eq(runs.id, runId));
  if (!run?.repoId || !run.prNumber) return { skipped: true };
  const [repo] = await db.select().from(repositories).where(eq(repositories.id, run.repoId));
  if (!repo?.installationId) return { skipped: true };
  const octokit = await getInstallationOctokit(repo.installationId);

  const baseUrl = (process.env.FRONTEND_URL || 'https://www.codeward.cloud').replace(/\/+$/, '');
  const runUrl = `${baseUrl}/dashboard/livefeed?runId=${run.id}`;
  const durationSeconds = Math.max(
    1,
    Math.round((Date.now() - new Date(run.createdAt || Date.now()).getTime()) / 1000)
  );

  const completion = buildCompletionOutput({
    runId: run.id,
    durationSeconds,
    findings: params.findings,
  });

  const finalConclusion = params.conclusion || completion.conclusion;

  if (run.githubCheckRunId) {
    await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
      owner: repo.owner,
      repo: repo.name,
      check_run_id: run.githubCheckRunId,
      status: 'completed',
      conclusion: finalConclusion,
      completed_at: new Date().toISOString(),
      details_url: runUrl,
      output: {
        title: completion.title || params.title,
        summary: completion.summary || params.summary,
        text: completion.text,
      },
    });
  }

  if (run.githubStatusCommentId) {
    await octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
      owner: repo.owner,
      repo: repo.name,
      comment_id: run.githubStatusCommentId,
      body: completion.text,
    });
  }
  return { completed: true };
}
