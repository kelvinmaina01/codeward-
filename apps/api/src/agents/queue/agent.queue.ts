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
import { agentTasks, runs } from '../../db/schema.js';
import { eq, and, notLike } from 'drizzle-orm';
import { getProvider } from '../core/registry.js';
import type { AgentDefinition, SandboxHandle, AgentRunConfig } from '../core/provider.js';
import { LocalExecSandbox } from '../../sandbox/local-exec.js';
import { FlySandbox } from '../../sandbox/fly-machine.js';
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
// Sandbox provider selection
// ---------------------------------------------------------------------------

/**
 * SANDBOX_PROVIDER=fly runs real, ephemeral, isolated Fly Machines — the actual isolation
 * boundary a multi-tenant product analyzing other people's repos needs. Previously this was
 * hardcoded to LocalExecSandbox unconditionally (the code comment claimed otherwise), meaning
 * every agent run executed arbitrary commands discovered in a customer's repo directly on
 * whatever machine ran this Node process. Defaults to 'local' — Fly is opt-in until a real
 * deployment sets the env var.
 */
function createSandbox(): LocalExecSandbox | FlySandbox {
  if (process.env.SANDBOX_PROVIDER === 'fly') {
    const image = process.env.FLY_SANDBOX_IMAGE || 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';
    return new FlySandbox({ image });
  }
  return new LocalExecSandbox();
}

/**
 * Create or claim this agent's tracking row. spawn_agent (real orchestrator tool) inserts a
 * 'queued' row immediately at dispatch time to avoid a race where the completion-check below
 * sees zero rows for a sibling agent that hasn't been picked up by a worker yet. Jobs enqueued
 * outside spawn_agent (tests, manual runs) won't have a pre-existing row — insert fresh then.
 */
async function claimTaskRow(runId: number, agentId: string, providerName?: string) {
  const [existing] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, agentId)));
  if (existing) {
    await db.update(agentTasks).set({ status: 'running', provider: providerName || 'openai', startedAt: new Date() }).where(eq(agentTasks.id, existing.id));
    return existing.id;
  }
  const [inserted] = await db.insert(agentTasks).values({
    runId, agentId, status: 'running', provider: providerName || 'openai', startedAt: new Date(),
  }).returning();
  return inserted.id;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export const agentWorker = new Worker('agent-jobs', async (job: Job<AgentJobData>) => {
  const { agentId, commitSHA, repoFullName, runId, provider: providerName, model } = job.data;

  console.log(`[AgentWorker] Starting ${agentId} for ${repoFullName}@${commitSHA} (run #${runId})`);

  const taskId = await claimTaskRow(runId, agentId, providerName);
  let sandbox: LocalExecSandbox | FlySandbox | null = null;

  try {
    // -----------------------------------------------------------------------
    // 1. Look up the agent definition
    // -----------------------------------------------------------------------
    const definition = agentDefinitions[agentId];
    if (!definition) {
      throw new Error(`Unknown agent: "${agentId}". Did you forget to register it?`);
    }

    // -----------------------------------------------------------------------
    // 2. Create a sandbox handle (real Fly Machine or local clone, per SANDBOX_PROVIDER)
    // -----------------------------------------------------------------------
    sandbox = createSandbox();
    await sandbox.init(`https://github.com/${repoFullName}.git`, commitSHA);

    // -----------------------------------------------------------------------
    // 3. Build the tools
    // -----------------------------------------------------------------------
    const tools = definition.createTools(sandbox);

    // -----------------------------------------------------------------------
    // 4. Build the run config
    // -----------------------------------------------------------------------
    // A real concurrent multi-agent stress test caught this: the orchestrator's tools
    // (spawn_agent, aggregate_results, store_orchestrator_result, ...) require a real runId/
    // repoId argument, but nothing ever told the model what they were — it had no choice but
    // to invent one. Logs showed it hallucinating runId: 1001 and even the literal string
    // "run-1", which crashed the real DB insert (Number("run-1") -> NaN) and meant spawn_agent
    // silently dispatched sub-agents against a run that didn't exist. Every one of Phase 1/2/3
    // needs the real identifiers stated explicitly, not left for the model to guess.
    const [runRow] = await db.select().from(runs).where(eq(runs.id, runId));
    const config: AgentRunConfig = {
      agentId: definition.id,
      systemPrompt: definition.systemPrompt,
      // The "no live instance" caveat isn't decoration — a real concurrent stress test without
      // it showed the model will sometimes fabricate a plausible-looking databaseUrl/baseUrl
      // to satisfy a tool's schema rather than treating it as absent, spending a real tool
      // call on a doomed connection attempt. Every dynamic-check tool already reports
      // applicable:false honestly when the param is missing — this just stops the model from
      // inventing one in the first place.
      taskPrompt: `Analyze commit ${commitSHA} on repository ${repoFullName}.
runId: ${runId}
repoId: ${runRow?.repoId ?? 'unknown — this run has no repoId on record; do not invent one, omit repoId-requiring tool arguments instead'}
Use these EXACT values for any tool parameter named runId/repoId — never invent, guess, or reuse a value from an example. This pipeline clones the repo and analyzes it statically — there is NO running instance of the app and NO live databaseUrl/baseUrl available. Tools that need one will honestly report applicable:false if you omit that argument; treat that as "not tested", never as "passed", and do not invent a placeholder connection string or URL to pass in. Follow your instructions precisely and report all findings as a JSON array.`,
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

/**
 * Real Phase 2 -> Phase 3 handoff. Previously nothing triggered Phase 3 at all — the comment
 * here literally said "a separate coordinator will trigger Phase 3" and none existed. Runs
 * after every sub-agent's terminal state (completed OR failed — a failed agent shouldn't hang
 * the pipeline forever) and checks whether any sibling sub-agent for this run is still
 * queued/running. If none, enqueues Phase 3. jobId is deterministic per run so a race between
 * two sub-agents finishing at nearly the same moment can't double-enqueue it.
 *
 * Also requires Phase 2's OWN task row to be terminal first: Phase 2's LLM loop dispatches
 * sub-agents one spawn_agent tool call at a time, so a fast sub-agent (5x worker concurrency
 * means one can start immediately) can finish before Phase 2 has finished calling spawn_agent
 * for its remaining siblings — without this guard, that read "0 pending" and fired Phase 3
 * while agents Phase 2 hadn't dispatched yet were still to come.
 */
async function checkAndTriggerPhase3(runId: number, repoFullName: string, commitSHA: string) {
  const [phase2] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, 'orchestrator_phase2')));
  if (!phase2 || phase2.status === 'queued' || phase2.status === 'running') return;

  const remaining = await db.select().from(agentTasks).where(
    and(eq(agentTasks.runId, runId), notLike(agentTasks.agentId, 'orchestrator%'))
  );
  const stillPending = remaining.filter((t: any) => t.status === 'queued' || t.status === 'running');
  if (stillPending.length > 0 || remaining.length === 0) return;

  console.log(`[Orchestrator] All ${remaining.length} sub-agents terminal for run #${runId}. Triggering Phase 3 (Decision).`);
  await agentQueue.add('orchestrator-phase3', {
    agentId: 'orchestrator_phase3',
    commitSHA,
    repoFullName,
    runId
  }, { jobId: `phase3-${runId}` });
}

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
    console.log(`[Orchestrator] Phase 2 complete. Checking whether any dispatched sub-agents already finished before this handler ran.`);
    await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
  } else if (!job.data.agentId.startsWith('orchestrator')) {
    await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
  }
});

agentWorker.on('failed', async (job, err) => {
  console.error(`[AgentQueue] Job ${job?.id} failed (${job?.data?.agentId}):`, err.message);
  if (job?.data && !job.data.agentId.startsWith('orchestrator')) {
    await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
  }
  broadcast('agent_failed', {
    repo: job?.data?.repoFullName || 'unknown',
    sha: job?.data?.commitSHA || 'unknown',
    agent: job?.data?.agentId || 'unknown',
    status: 'Failed',
    error: err.message
  });
});
