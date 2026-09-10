import './instrument.js';
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { startAgentWorker } from './agents/queue/agent.queue.js';
import { startEscalationWorker } from './agents/escalation/escalation.queue.js';
import { startMergeWorker } from './agents/merge/merge.queue.js';

console.log(`[Codeward Worker] 🚀 Initializing standalone worker process...`);
console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`  Agent Worker Concurrency: ${process.env.WORKER_CONCURRENCY || '10'}`);
console.log(`  Per-Repo Rate Limiter: ${process.env.REPO_CONCURRENCY_MAX || '4'} jobs/sec`);
console.log(`  Escalation Concurrency: ${process.env.ESCALATION_CONCURRENCY || '3'}`);
console.log(`  GitHub Issue Rate Max: ${process.env.GITHUB_ISSUE_RATE_MAX || '20'}/min`);

const agentWorker = startAgentWorker();
const escalationWorker = startEscalationWorker();
const mergeWorker = startMergeWorker();

console.log(`[Codeward Worker] ✅ All workers active and listening for BullMQ jobs:`);
console.log(`  - agent-jobs (AgentWorker)`);
console.log(`  - escalation-jobs (EscalationWorker)`);
console.log(`  - merge-jobs (MergeWorker)`);

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Codeward Worker] 🛑 ${signal} received. Initiating graceful worker shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error(`[Codeward Worker] ⚠️ Forced exit after 30s timeout.`);
    process.exit(1);
  }, 30_000);

  try {
    console.log(`[Codeward Worker] Pausing workers and waiting for in-flight jobs to complete...`);
    await Promise.allSettled([
      agentWorker.close(),
      escalationWorker.close(),
      mergeWorker.close(),
    ]);
    clearTimeout(shutdownTimeout);
    console.log(`[Codeward Worker] ✅ All workers cleanly shut down. Exiting.`);
    process.exit(0);
  } catch (err) {
    console.error(`[Codeward Worker] ❌ Error during shutdown:`, err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  console.error(`\n[${new Date().toISOString()}] 💥 Worker Uncaught Exception:`, err.message);
  console.error(err.stack);
  Sentry.captureException(err);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error(`\n[${new Date().toISOString()}] 🔥 Worker Unhandled Rejection:`, reason);
  if (reason instanceof Error) {
    Sentry.captureException(reason);
  }
});
