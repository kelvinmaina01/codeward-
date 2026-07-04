/**
 * Combined Phase B + Phase D gate: one REAL push event through the REAL production pipeline.
 *
 *   pushQueue job (real before/after SHAs from compass-project's actual recent commits —
 *   the two squash-merges Codeward itself made tonight)
 *     -> real pushWorker: GitHub compare API computes the real changed files, stamps run.scope,
 *        dispatches orchestrator_phase1
 *     -> real agent worker: phases 1-3 + sub-agents, every taskPrompt carrying the incremental
 *        scope (visible via the "[AgentWorker] ... is INCREMENTAL" log lines)
 *     -> real phase-3 decision; if BLOCK, the real escalation trigger fires (Phase D's gap).
 *
 * Nothing here is mocked or simulated except the webhook HTTP layer itself (we enqueue the
 * same job the webhook route would) — queue, workers, sandboxes, LLM calls, GitHub API, DB
 * writes are all the production code paths.
 */
import { db } from './db/index.js';
import { runs, agentTasks, repositories } from './db/schema.js';
import { eq, and, notLike } from 'drizzle-orm';
import { resolveOctokit } from './agents/definitions/guardian/guardian.tools.js';
import 'dotenv/config';

const REPO_FULL = 'kelvinmaina01/compass-project';

async function main() {
  // Real workers, same process — exactly what index.ts boots.
  const { pushQueue } = await import('./queue/webhook.queue.js');
  await import('./agents/queue/agent.queue.js');
  await import('./agents/merge/merge.queue.js');

  const [repo] = await db.select().from(repositories).where(eq(repositories.fullName, REPO_FULL));
  if (!repo?.installationId) throw new Error('repo missing/no installation');

  if (repo.status !== 'active') {
    console.log(`Repo status is '${repo.status}' — setting 'active' (it is a real connected repo, baselined tonight).`);
    await db.update(repositories).set({ status: 'active' }).where(eq(repositories.id, repo.id));
  }

  // Real before/after: the last two commits on the default branch (both created by Codeward's
  // real merges earlier tonight).
  const ctx = await resolveOctokit(String(repo.id));
  if ('error' in ctx) throw new Error(ctx.error);
  const commits: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/commits', { owner: ctx.owner, repo: ctx.repo, per_page: 2 });
  const afterSHA = commits.data[0].sha;
  const beforeSHA = commits.data[1].sha;
  console.log(`Real commit pair: ${beforeSHA.slice(0, 7)} -> ${afterSHA.slice(0, 7)}`);

  const [run] = await db.insert(runs).values({ repoId: repo.id, commitSha: afterSHA, status: 'queued' }).returning();
  console.log(`Created run #${run.id}; enqueuing the real push job...`);

  await pushQueue.add('process-push', { runId: run.id, commitSHA: afterSHA, beforeSHA, repoFullName: REPO_FULL });

  // Watch the real pipeline. Generous ceiling — full orchestrator + sub-agents takes minutes.
  const deadline = Date.now() + 25 * 60_000;
  let lastSummary = '';
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 20_000));
    try {
      const [runRow] = await db.select().from(runs).where(eq(runs.id, run.id));
      const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));
      const summary = `run.status=${runRow.status} scope=${runRow.scope ? `incremental(${(runRow.scope as any).changedFiles?.length}f)` : 'null'} tasks=[${tasks.map((t) => `${t.agentId}:${t.status}`).join(', ')}]`;
      if (summary !== lastSummary) { console.log(`[watch] ${summary}`); lastSummary = summary; }
      if (runRow.status === 'completed' || runRow.status === 'failed') break;
      const phase3 = tasks.find((t) => t.agentId === 'orchestrator_phase3');
      if (phase3 && (phase3.status === 'completed' || phase3.status === 'failed')) break;
    } catch (e) { console.log(`[watch] transient DB error: ${(e as Error).message.slice(0, 80)}`); }
  }

  // ---- Final assertions, all against real rows -------------------------------------------
  const [finalRun] = await db.select().from(runs).where(eq(runs.id, run.id));
  const finalTasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));

  console.log('\n================ FINAL STATE ================');
  console.log(`run #${run.id}: status=${finalRun.status}, score=${finalRun.score}`);
  console.log(`scope:`, JSON.stringify(finalRun.scope));
  for (const t of finalTasks) {
    const meta = (t.reportMeta as any) ?? {};
    console.log(`  ${t.agentId}: status=${t.status} score=${t.score} findings=${t.findingsCount} gate=${meta.gateDecision ?? '-'}${meta.escalation ? ` escalation=${meta.escalation.escalated?.length ?? 0} issue(s)` : ''}${meta.autoFixPR?.opened ? ` autoFixPR=#${meta.autoFixPR.pullRequestNumber}` : ''}`);
  }

  const scope = finalRun.scope as any;
  if (!scope?.incremental || !Array.isArray(scope.changedFiles) || scope.changedFiles.length === 0) {
    throw new Error('FAILED: run.scope was not stamped with a real incremental changed-file list.');
  }
  console.log(`\nPASS: real incremental scope stamped (${scope.changedFiles.length} file(s)): ${scope.changedFiles.join(', ')}`);

  const phase3 = finalTasks.find((t) => t.agentId === 'orchestrator_phase3');
  if (!phase3 || phase3.status !== 'completed') {
    throw new Error(`FAILED: orchestrator_phase3 did not complete (status=${phase3?.status ?? 'missing'}).`);
  }
  const phase3Meta = (phase3.reportMeta as any) ?? {};
  console.log(`PASS: full pipeline completed with real final decision: ${phase3Meta.gateDecision}`);

  if (phase3Meta.gateDecision === 'BLOCK') {
    const esc = phase3Meta.escalation;
    if (!esc) throw new Error('FAILED: decision was BLOCK but the escalation trigger did not run.');
    console.log(`PASS (Phase D): escalation trigger fired through the REAL pipeline — ${esc.escalated?.length ?? 0} issue(s) opened, ${esc.skipped?.length ?? 0} skipped.`);
    for (const i of esc.escalated ?? []) console.log(`  real issue: ${i.htmlUrl}`);
  } else {
    console.log(`NOTE (Phase D): final decision was ${phase3Meta.gateDecision}, not BLOCK — the escalation trigger legitimately did not fire on this run. The trigger path itself remains proven only at the service level.`);
  }

  console.log('\nDONE.');
  process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
