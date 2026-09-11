import { generateText } from 'ai';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agentTasks, repositories, runs } from '../db/schema.js';
import { getInstallationOctokit } from '../lib/github.js';
import { getModel } from '../providers/model.provider.js';

/** Answers explicit PR mentions from stored sandbox evidence; never invents a finding. */
export async function respondToGithubMention(input: { repoFullName: string; prNumber: number; body: string; inlineCommentId?: number }) {
  const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, input.repoFullName));
  if (!repo?.installationId) return { skipped: 'repo not connected' };
  const [run] = await db.select().from(runs).where(and(eq(runs.repoId, repo.id), eq(runs.prNumber, input.prNumber))).orderBy(desc(runs.createdAt)).limit(1);
  const tasks = run ? await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id)) : [];
  const evidence = tasks.map((t) => ({ agent: t.agentId, status: t.status, score: t.score, findings: (t.findings as unknown[] ?? []).slice(0, 8) }));
  const { text } = await generateText({
    model: getModel('analyzer'),
    system: 'You are Codeward Guardian. Answer only from the supplied completed sandbox evidence. If it is insufficient, say so and offer a focused rerun. Be concise GitHub Markdown. Never claim you changed code or dismissed a finding.',
    prompt: `Developer message: ${input.body.slice(0, 4000)}\n\nRun: ${run ? `#${run.id} ${run.commitSha}` : 'no completed run'}\nEvidence: ${JSON.stringify(evidence).slice(0, 24000)}`,
  });
  const octokit = await getInstallationOctokit(repo.installationId);
  const reply = `**Codeward Guardian**\n\n${text.trim()}\n\n<sub>Evidence: ${run ? `run #${run.id}` : 'no matching run'} · Reply with \`@codeward rerun …\` to request a focused check.</sub>`;
  if (input.inlineCommentId) {
    await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies', { owner: repo.owner, repo: repo.name, pull_number: input.prNumber, comment_id: input.inlineCommentId, body: reply });
  } else {
    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', { owner: repo.owner, repo: repo.name, issue_number: input.prNumber, body: reply });
  }
  return { replied: true, runId: run?.id ?? null };
}
