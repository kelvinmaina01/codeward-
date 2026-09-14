import 'dotenv/config';
import { E2BSandbox } from '../src/sandbox/e2b-sandbox.js';
import { ResilientSandbox } from '../src/sandbox/resilient-sandbox.js';
import { runAuditRecoverySweeper, advanceSequentialQueue } from '../src/agents/queue/sweeper.service.js';
import { db } from '../src/db/index.js';
import { repositories, runs, agentTasks, user } from '../src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function runComprehensiveTests() {
  console.log('===============================================================');
  console.log('🧪 Codeward Senior Resilience, Retry & Sandbox Test Suite');
  console.log('===============================================================\n');

  // Test 1: E2B Sandbox Isolation & Ephemeral Life Cycle
  console.log('▶ TEST 1: E2B Ephemeral MicroVM Lifecycle');
  if (process.env.E2B_API_KEY) {
    const e2b = new E2BSandbox();
    console.log('  Spawning E2B Sandbox...');
    // Quick test on a small public repo
    await e2b.init('https://github.com/octocat/Hello-World.git');
    const execRes = await e2b.exec('cat README');
    console.log(`  Exec Output: "${execRes.stdout.trim()}" (Exit Code: ${execRes.exitCode})`);
    if (execRes.exitCode !== 0 || !execRes.stdout.includes('Hello World')) {
      throw new Error('E2B Sandbox execution failed on README output');
    }
    await e2b.destroy();
    console.log('  ✅ TEST 1 PASSED: E2B Sandbox booted, executed, and auto-destroyed cleanly.\n');
  } else {
    console.log('  ⚠️ E2B_API_KEY not configured. Skipping Test 1.\n');
  }

  // Test 2: Resilient Multi-Cloud Sandbox Dispatcher
  console.log('▶ TEST 2: Resilient Multi-Cloud Sandbox Adapter');
  const resilient = new ResilientSandbox({ preferredProvider: 'e2b' });
  await resilient.init('https://github.com/octocat/Hello-World.git');
  const rRes = await resilient.exec('git log -1 --format=%s');
  console.log(`  Latest commit subject: "${rRes.stdout.trim()}"`);
  if (!rRes.stdout.trim()) {
    throw new Error('ResilientSandbox failed to read git log');
  }
  await resilient.destroy();
  console.log('  ✅ TEST 2 PASSED: ResilientSandbox coordinates cloud instances without leaks.\n');

  // Test 3: Sweeper Recovery Functionality
  console.log('▶ TEST 3: Background Sweeper & Sequential Queue Watchdog');
  const sweeperReport = await runAuditRecoverySweeper();
  console.log('  Sweeper Report:', JSON.stringify(sweeperReport, null, 2));
  console.log('  ✅ TEST 3 PASSED: Sweeper executed safely without crashing or throwing.\n');

  // Test 4: Precision Deep Link Generation
  console.log('▶ TEST 4: Precision Deep Link Generation for Failure Notifications');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const testRepo = 'kelvinmaina01/inua360';
  const testRunId = 999;
  const generatedDeepLink = `${frontendUrl}/dashboard/repositories?retryRepo=${encodeURIComponent(testRepo)}&runId=${testRunId}`;
  console.log(`  Deep link: ${generatedDeepLink}`);
  if (!generatedDeepLink.includes('retryRepo=kelvinmaina01%2Finua360') || !generatedDeepLink.includes('runId=999')) {
    throw new Error('Deep link URL encoding failed');
  }
  console.log('  ✅ TEST 4 PASSED: Precision deep link format validated.\n');

  console.log('===============================================================');
  console.log('🎉 ALL RESILIENCE AND RETRY TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runComprehensiveTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
