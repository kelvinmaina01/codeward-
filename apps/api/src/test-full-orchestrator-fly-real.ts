/**
 * The real end-to-end test: webhook-equivalent trigger -> orchestrator_phase1 (real LLM,
 * real git diff analysis) -> orchestrator_phase2 (real LLM, real spawn_agent BullMQ enqueues)
 * -> N real sub-agents each in a genuine ephemeral Fly Machine -> auto-triggered
 * orchestrator_phase3 (real aggregate_results DB query, real gate decision) -> real
 * submit_orchestrator_decision. Every hop is the actual production code path — nothing
 * bypassed, nothing simulated.
 */
process.env.SANDBOX_PROVIDER = 'fly';
import 'dotenv/config';
import { db } from './db/index.js';
import { runs, agentTasks } from './db/schema.js';
import { eq, and, notLike } from 'drizzle-orm';
import { agentQueue, agentWorker } from './agents/queue/agent.queue.js';

const REPO_FULL_NAME = 'kelvinmaina01/codeward-';

async function main() {
  const [run] = await db.insert(runs).values({ commitSha: 'baseline', status: 'queued' }).returning();
  console.log(`Created run #${run.id}`);

  await agentQueue.add('orchestrator-phase1', {
    agentId: 'orchestrator_phase1',
    commitSHA: 'baseline',
    repoFullName: REPO_FULL_NAME,
    runId: run.id
  });
  console.log('Enqueued orchestrator_phase1 — SANDBOX_PROVIDER=fly for every real sub-agent. Watching Postgres for the full chain...\n');

  const deadline = Date.now() + 15 * 60 * 1000;
  const seen = new Set<string>();
  while (Date.now() < deadline) {
    let tasks;
    try {
      tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));
    } catch (e: any) {
      // A prior run hit CONNECTION_CLOSED against the Supabase pooler mid-poll — a real but
      // transient blip, not a reason to kill a 12-minute test. Skip this tick and retry.
      console.log(`[poll] transient DB error, retrying: ${e.message}`);
      await new Promise(r => setTimeout(r, 4000));
      continue;
    }
    for (const t of tasks) {
      const key = `${t.agentId}:${t.status}`;
      if (!seen.has(key)) {
        seen.add(key);
        console.log(`[${new Date().toISOString()}] ${t.agentId} -> ${t.status}${t.score != null ? ` (score ${t.score})` : ''}${t.error ? ` ERROR: ${t.error}` : ''}`);
      }
    }
    const phase3 = tasks.find(t => t.agentId === 'orchestrator_phase3');
    if (phase3 && (phase3.status === 'completed' || phase3.status === 'failed')) {
      console.log('\n=== FULL CHAIN RESULT ===');
      const [runRow] = await db.select().from(runs).where(eq(runs.id, run.id));
      console.log('Final run row:', JSON.stringify(runRow));
      console.log('\nAll agent_tasks for this run:');
      for (const t of tasks) {
        console.log(`  ${t.agentId}: ${t.status}, score=${t.score}, findings=${t.findingsCount ?? (t.findings as any)?.length ?? 0}, duration=${t.duration}ms`);
      }
      await agentWorker.close();
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log('TIMEOUT after 12 minutes');
  await agentWorker.close();
  process.exit(1);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
