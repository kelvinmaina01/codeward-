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
import { Redis } from 'ioredis';
import dotenv from 'dotenv';
import { db } from '../../db/index.js';
import { agentTasks } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getProvider } from '../core/registry.js';
import type { AgentDefinition, SandboxHandle, AgentRunConfig } from '../core/provider.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Connection (reuses the same Redis as the webhook queue)
// ---------------------------------------------------------------------------

const connection = new Redis(process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

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
  provider?: string;       // Override provider (default: 'anthropic')
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
    provider: providerName || 'anthropic',
    startedAt: new Date(),
  }).returning();

  const taskId = taskRow.id;

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
    // For now, we create a mock sandbox that the orchestrator will replace
    // with a real one when we wire up the full pipeline.
    const sandbox: SandboxHandle = {
      exec: async (cmd: string) => {
        console.log(`[AgentWorker] Sandbox exec: ${cmd}`);
        // TODO: Replace with real FlySandbox.exec() when orchestrator is wired
        return { exitCode: 0, stdout: '', stderr: '' };
      },
      destroy: async () => {
        // TODO: Replace with real FlySandbox.destroy()
      },
    };

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
  }

}, {
  connection: connection as any,
  concurrency: 5,   // Run up to 5 agents in parallel (matches Promise.all pattern)
});

// ---------------------------------------------------------------------------
// Event Logging
// ---------------------------------------------------------------------------

agentWorker.on('completed', (job) => {
  console.log(`[AgentQueue] Job ${job.id} completed (${job.data.agentId})`);
});

agentWorker.on('failed', (job, err) => {
  console.error(`[AgentQueue] Job ${job?.id} failed (${job?.data.agentId}):`, err.message);
});
