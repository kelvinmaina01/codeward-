import { db } from '../src/db/index.js';
import { runs, agentTasks, runLogs, repositories } from '../src/db/schema.js';
import { desc, eq } from 'drizzle-orm';

async function run() {
  console.log('--- REPOSITORIES ---');
  const allRepos = await db.select().from(repositories);
  console.log('Repos count:', allRepos.length);
  for (const r of allRepos) {
    console.log(`Repo #${r.id}: ${r.fullName} (ownerId: ${r.userId})`);
  }

  console.log('\n--- RUNS ---');
  const allRuns = await db.select().from(runs).orderBy(desc(runs.createdAt)).limit(5);
  console.log('Runs count (latest 5):', allRuns.length);
  for (const r of allRuns) {
    console.log(`Run #${r.id}: repoId=${r.repoId}, commit=${r.commitSha}, status=${r.status}, score=${r.score}`);
  }

  console.log('\n--- DETAILS OF FULL RUNS ---');
  for (const rId of [77, 68, 60, 58, 33, 32]) {
    const [r] = await db.select().from(runs).where(eq(runs.id, rId));
    if (!r) continue;
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, r.repoId));
    const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, rId));
    console.log(`Run #${rId} | repo: ${repo?.fullName} (#${r.repoId}) | status: ${r.status} | score: ${r.score} | tasks: ${tasks.length}`);
    for (const t of tasks) {
      console.log(`   Task: ${t.agentId} | model: ${t.model} | status: ${t.status} | score: ${t.score} | findings: ${t.findingsCount}`);
    }
  }
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
