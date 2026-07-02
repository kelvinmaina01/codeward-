import 'dotenv/config';
import { chatAgent } from './agents/definitions/chat.agent.js';
import type { SandboxHandle } from './agents/core/provider.js';

const dummySandbox: SandboxHandle = { exec: async () => ({ exitCode: 1, stdout: '', stderr: 'no repo checked out in this test' }), destroy: async () => {} };

async function main() {
  const tools: any = chatAgent.createTools(dummySandbox);

  console.log('--- query_run_history(repoId=12) ---');
  console.log(JSON.stringify(await tools.query_run_history.execute({ repoId: '12', limit: 3 }), null, 2).slice(0, 1000));

  console.log('\n--- compare_repos([12,13,14]) ---');
  console.log(JSON.stringify(await tools.compare_repos.execute({ repoIds: ['12', '13', '14'] }), null, 2));

  console.log('\n--- get_health_trend(repoId=12) ---');
  console.log(JSON.stringify(await tools.get_health_trend.execute({ repoId: '12' }), null, 2));

  console.log('\n--- get_fix_priority_list(repoId=12) ---');
  console.log(JSON.stringify(await tools.get_fix_priority_list.execute({ repoId: '12' }), null, 2));

  console.log('\n--- dismiss_finding: real write to agent_memory ---');
  const dismissRes = await tools.dismiss_finding.execute({ repoId: '12', findingId: 'test-finding-verify-001', reason: 'stress-test verification', dismissedBy: 'test-script' });
  console.log(JSON.stringify(dismissRes));

  console.log('\n--- verifying the write actually persisted (separate read) ---');
  const { db } = await import('./db/index.js');
  const { agentMemory } = await import('./db/schema.js');
  const { eq } = await import('drizzle-orm');
  const rows = await db.select().from(agentMemory).where(eq(agentMemory.repoId, '12'));
  console.log('Rows found for repoId=12:', rows.filter((r: any) => r.summary.includes('test-finding-verify-001')));
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
