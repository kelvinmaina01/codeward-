import { agentWorker } from '../src/agents/queue/agent.queue.js';

async function runTest() {
  console.log('[TEST] Starting BullMQ Concurrency Test...');
  
  // The worker has already been instantiated by the import above.
  // We check its configured concurrency.
  const configuredConcurrency = agentWorker.opts.concurrency;
  
  console.log(`[TEST] Worker instantiated with concurrency: ${configuredConcurrency}`);
  
  if (configuredConcurrency === 5) {
    console.error('[FAIL] Worker concurrency is still hardcoded to 5.');
    process.exit(1);
  } else if (configuredConcurrency === 10 || (process.env.WORKER_CONCURRENCY && configuredConcurrency === parseInt(process.env.WORKER_CONCURRENCY, 10))) {
    console.log('[PASS] Worker concurrency is correctly reading from dynamic environment (or default 10).');
  } else {
    console.warn(`[WARNING] Unexpected concurrency value: ${configuredConcurrency}`);
  }

  // Cleanup to allow the process to exit cleanly
  await agentWorker.close();
  console.log('[TEST] Test complete. Sandbox closed.');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
