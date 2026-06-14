import { agentQueue, registerAgent } from './agents/queue/agent.queue.js';
import { securityAgent } from './agents/definitions/security.agent.js';
import { db } from './db/index.js';
import { runs } from './db/schema.js';

async function main() {
  console.log('Registering Security Agent...');
  registerAgent(securityAgent);

  console.log('Creating mock run in database...');
  const [run] = await db.insert(runs).values({
    commitSha: 'test-commit-' + Date.now(),
    status: 'running',
  }).returning();

  console.log(`Created Run ID: ${run.id}`);

  console.log('Adding job to Agent Queue...');
  const job = await agentQueue.add('security-test', {
    agentId: 'security',
    commitSHA: 'main',
    repoFullName: 'kelvinmaina01/codeward-',
    runId: run.id,
  });

  console.log(`Job added: ${job.id}. Worker should pick it up automatically.`);
  
  // Wait for 3 minutes so the worker can process all tool loops
  await new Promise(resolve => setTimeout(resolve, 180000));
  
  console.log('Fetching agent run results from DB...');
  const { agentTasks } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  const [taskRow] = await db.select().from(agentTasks).where(eq(agentTasks.runId, run.id));
  
  if (taskRow) {
    console.log(`Agent Status: ${taskRow.status}`);
    console.log(`Final Findings: ${JSON.stringify(taskRow.findings, null, 2)}`);
  } else {
    console.log('No task row found!');
  }
  
  console.log('Test script finishing.');
  process.exit(0);
}

main().catch(console.error);
