import { db } from './db/index.js';
import { runs, agentTasks } from './db/schema.js';
import { createOrchestratorTools } from './agents/definitions/orchestrator/orchestrator.tools.js';
import { LocalExecSandbox } from './sandbox/local-exec.js';

async function main() {
  console.log('--- Testing Phase 2 and 3 Tools ---');
  
  // 1. Seed some dummy data
  console.log('Seeding fake run into database...');
  const [fakeRun] = await db.insert(runs).values({
    commitSha: 'fake-commit-sha',
    status: 'running',
    visibility: 'private',
  }).returning();

  await db.insert(agentTasks).values([
    {
      runId: fakeRun.id,
      agentId: 'security',
      status: 'completed',
      score: 90,
      findingsCount: 1,
      findings: [{ title: 'Secret exposed', severity: 'CRITICAL', category: 'Security' }]
    },
    {
      runId: fakeRun.id,
      agentId: 'bloat',
      status: 'completed',
      score: 60,
      findingsCount: 5,
      findings: []
    }
  ]);

  const dummySandbox = new LocalExecSandbox(); // Just to satisfy the signature
  const tools = createOrchestratorTools(dummySandbox);

  try {
    console.log('\n--- Testing aggregate_results ---');
    const aggregateRes = await tools.aggregate_results.execute({
      runId: String(fakeRun.id)
    });
    console.log('Aggregate Result:', JSON.stringify(aggregateRes, null, 2));

    console.log('\n--- Testing store_orchestrator_result ---');
    const storeRes = await tools.store_orchestrator_result.execute({
      runId: String(fakeRun.id),
      result: { overallWeightedScore: aggregateRes.weightedScore }
    });
    console.log('Store Result:', storeRes);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    console.log('Cleaning up DB...');
    // We can't delete easily without cascading, just leave it as it's a dev db, 
    // or just let it be.
    process.exit(0);
  }
}

main();
