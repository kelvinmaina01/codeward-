/**
 * Real end-to-end test of ONE agent through the actual BullMQ queue worker, with
 * SANDBOX_PROVIDER=fly so it runs inside a genuine, isolated Fly Machine — not the local
 * dev shortcut. Proves the FlySandbox init()/workDir fix works with real tool-calling, not
 * just the plain-command smoke test from before.
 */
process.env.SANDBOX_PROVIDER = 'fly';
import 'dotenv/config';
import { db } from './db/index.js';
import { runs, agentTasks } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { agentQueue, agentWorker } from './agents/queue/agent.queue.js';

const REPO_FULL_NAME = 'kelvinmaina01/codeward-';

async function main() {
  const [run] = await db.insert(runs).values({ commitSha: 'baseline', status: 'running' }).returning();
  console.log(`Created run #${run.id}`);

  await agentQueue.add('agent-bloat', {
    agentId: 'bloat',
    commitSHA: 'baseline',
    repoFullName: REPO_FULL_NAME,
    runId: run.id
  });
  console.log('Enqueued real bloat job with SANDBOX_PROVIDER=fly. Waiting for the worker...');

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));
    if (task && (task.status === 'completed' || task.status === 'failed')) {
      console.log('\n=== RESULT ===');
      console.log(JSON.stringify({ status: task.status, score: task.score, findingsCount: task.findingsCount, error: task.error, duration: task.duration }, null, 2));
      await agentWorker.close();
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log('TIMEOUT after 5 minutes');
  await agentWorker.close();
  process.exit(1);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
