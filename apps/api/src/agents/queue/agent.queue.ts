/**
 * ============================================================================
 * Agent Task Queue — BullMQ integration for agent job processing
 * ============================================================================
 * 
 * This plugs into our existing BullMQ infrastructure (webhook.queue.ts).
 * The webhook worker dispatches agent jobs here. This worker:
 * 
 * 1. Receives the job { agentId, commitSHA, repoFullName, runId }
 * 2. Looks up the agent definition (tools + system prompt)
 * 3. Gets the correct provider from the registry
 * 4. Executes the agent via provider.execute()
 * 5. Writes the AgentResult to the agent_tasks table in Postgres
 * 
 * Because the provider is abstracted, this worker doesn't care
 * whether Claude, GPT, or a custom model powers the agent.
 * ============================================================================
 */

import { Queue, Worker, Job } from 'bullmq';
import dotenv from 'dotenv';
import { createRedisConnection } from '../../lib/redis.js';
import { db } from '../../db/index.js';
import { agentTasks } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getProvider } from '../core/registry.js';
import type { AgentDefinition, SandboxHandle, AgentRunConfig } from '../core/provider.js';
import { LocalExecSandbox } from '../../sandbox/local-exec.js';
import { orchestratorPhase1Agent, orchestratorPhase2Agent, orchestratorPhase3Agent } from '../definitions/orchestrator.agent.js';
import { bloatAgent } from '../definitions/bloat.agent.js';
import { brokenCodeAgent } from '../definitions/broken_code.agent.js';
import { architectureAgent } from '../definitions/architecture.agent.js';
import { securityAgent } from '../definitions/security.agent.js';
import { complianceAgent } from '../definitions/compliance.agent.js';
import { dataDxAgent } from '../definitions/data_dx.agent.js';
import { aiEraAgent } from '../definitions/ai_era.agent.js';
import { guardianAgent } from '../definitions/guardian.agent.js';
import { chatAgent } from '../definitions/chat.agent.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Connection (reuses the same Redis as the webhook queue)
// ---------------------------------------------------------------------------

const connection = createRedisConnection();

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const agentQueue = new Queue('agent-jobs', { connection: connection as any });

// ---------------------------------------------------------------------------
// Job Interface
// ---------------------------------------------------------------------------

export interface AgentJobData {
  agentId: string;         // 'security' | 'bloat' | 'architecture' | etc.
  commitSHA: string;
  repoFullName: string;
  runId: number;
  provider?: string;       // Override provider (default: 'openai' — see registry.ts)
  model?: string;          // Override model
}

// ---------------------------------------------------------------------------
// Agent Definition Registry (populated at startup)
// ---------------------------------------------------------------------------

const agentDefinitions: Record<string, AgentDefinition> = {};

/**
 * Register an agent definition so the queue worker knows how to run it.
 * Called at app startup for each agent (Security, Bloat, etc.)
 */
export function registerAgent(definition: AgentDefinition) {
  agentDefinitions[definition.id] = definition;
  console.log(`[AgentQueue] Registered agent: ${definition.id} (${definition.displayName})`);
}

// Auto-register orchestrator agents
registerAgent(orchestratorPhase1Agent);
registerAgent(orchestratorPhase2Agent);
registerAgent(orchestratorPhase3Agent);

// Auto-register every sub-agent. Previously only the 3 orchestrator phases were registered
// here, so spawn_agent's real BullMQ enqueue for e.g. "security" would reach this worker and
// throw "Unknown agent: security" — the tool wiring was real, the queue registration wasn't.
registerAgent(bloatAgent);
registerAgent(brokenCodeAgent);
registerAgent(architectureAgent);
registerAgent(securityAgent);
registerAgent(complianceAgent);
registerAgent(dataDxAgent);
registerAgent(aiEraAgent);
registerAgent(guardianAgent);
registerAgent(chatAgent);

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const agentWorker = new Worker('agent-jobs', async (job: Job<AgentJobData>) => {
  const { agentId, commitSHA, repoFullName, runId, provider: providerName, model } = job.data;

  console.log(`[AgentWorker] Starting ${agentId} for ${repoFullName}@${commitSHA} (run #${runId})`);

  // Mark the task as running in the database
  const [taskRow] = await db.insert(agentTasks).values({
    runId,
    agentId,
    status: 'running',
    provider: providerName || 'openai',
    startedAt: new Date(),
  }).returning();

  const taskId = taskRow.id;
  let sandbox: LocalExecSandbox | null = null;

  try {
    // -----------------------------------------------------------------------
    // 1. Look up the agent definition
    // -----------------------------------------------------------------------
    const definition = agentDefinitions[agentId];
    if (!definition) {
      throw new Error(`Unknown agent: "${agentId}". Did you forget to register it?`);
    }

    // -----------------------------------------------------------------------
    // 2. Create a sandbox handle
    // -----------------------------------------------------------------------
    // In production, this would spin up a Fly Machine.
    // For local dev, we clone the repo natively using LocalExecSandbox.
    sandbox = new LocalExecSandbox();
    // We clone the repository dynamically for the agent
    await sandbox.init(`https://github.com/${repoFullName}.git`, commitSHA);

    // -----------------------------------------------------------------------
    // 3. Build the tools
    // -----------------------------------------------------------------------
    const tools = definition.createTools(sandbox);

    // -----------------------------------------------------------------------
    // 4. Build the run config
    // -----------------------------------------------------------------------
    const config: AgentRunConfig = {
      agentId: definition.id,
      systemPrompt: definition.systemPrompt,
      taskPrompt: `Analyze commit ${commitSHA} on repository ${repoFullName}. Follow your instructions precisely and report all findings as a JSON array.`,
      tools,
      maxSteps: definition.maxSteps,
      model: model || definition.defaultModel,
      commitSHA,
      repoFullName,
    };

    // -----------------------------------------------------------------------
    // 5. Execute via the provider
    // -----------------------------------------------------------------------
    const provider = getProvider(providerName);
    const result = await provider.execute(config);

    // -----------------------------------------------------------------------
    // 6. Write results to the database
    // -----------------------------------------------------------------------
    await db.update(agentTasks)
      .set({
        status: result.status === 'error' ? 'failed' : 'completed',
        score: result.score,
        findingsCount: result.findings.length,
        findings: result.findings,
        model: result.modelUsed,
        tokenUsage: result.tokenUsage,
        duration: result.duration,
        completedAt: new Date(),
      })
      .where(eq(agentTasks.id, taskId));

    console.log(`[AgentWorker] ${agentId} completed: score=${result.score}, findings=${result.findings.length}, duration=${result.duration}ms`);

    return result;

  } catch (error) {
    const err = error as Error;
    console.error(`[AgentWorker] ${agentId} failed:`, err.message);

    // Mark as failed in the database
    await db.update(agentTasks)
      .set({
        status: 'failed',
        error: err.message,
        completedAt: new Date(),
      })
      .where(eq(agentTasks.id, taskId));

    throw error; // Re-throw so BullMQ can handle retries
  } finally {
    if (sandbox) {
      await sandbox.destroy();
    }
  }

}, {
  connection: connection as any,
  concurrency: 5,   // Run up to 5 agents in parallel (matches Promise.all pattern)
});

// ---------------------------------------------------------------------------
// Event Logging & Real-time Broadcast
// ---------------------------------------------------------------------------

import { broadcast } from '../../routes/ws.js';

agentWorker.on('active', (job) => {
  broadcast('agent_active', {
    repo: job.data.repoFullName,
    sha: job.data.commitSHA,
    agent: job.data.agentId,
    status: 'Running'
  });
});

agentWorker.on('completed', async (job) => {
  console.log(`[AgentQueue] Job ${job.id} completed (${job.data.agentId})`);
  broadcast('agent_completed', {
    repo: job.data.repoFullName,
    sha: job.data.commitSHA,
    agent: job.data.agentId,
    status: 'Completed',
    score: job.returnvalue?.score
  });

  // Orchestrator State Transitions
  if (job.data.agentId === 'orchestrator_phase1') {
    console.log(`[Orchestrator] Phase 1 complete. Triggering Phase 2 (Dispatch).`);
    // Enqueue Phase 2, passing the Phase 1 findings in payload if needed
    await agentQueue.add('orchestrator-phase2', {
      agentId: 'orchestrator_phase2',
      commitSHA: job.data.commitSHA,
      repoFullName: job.data.repoFullName,
      runId: job.data.runId
    });
  } else if (job.data.agentId === 'orchestrator_phase2') {
    console.log(`[Orchestrator] Phase 2 complete. Waiting for sub-agents to finish.`);
    // The await_agent_results tool or a separate coordinator will trigger Phase 3
  }
});

agentWorker.on('failed', (job, err) => {
  console.error(`[AgentQueue] Job ${job?.id} failed (${job?.data?.agentId}):`, err.message);
  broadcast('agent_failed', {
    repo: job?.data?.repoFullName || 'unknown',
    sha: job?.data?.commitSHA || 'unknown',
    agent: job?.data?.agentId || 'unknown',
    status: 'Failed',
    error: err.message
  });
});
