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

import { Queue, Worker, Job, UnrecoverableError } from 'bullmq';
import { customBackoffStrategy } from '../../lib/queue-backoff.js';
import dotenv from 'dotenv';
import { createRedisConnection, BULLMQ_PREFIX } from '../../lib/redis.js';
import { workerDb as db } from '../../db/index.js';
import { agentTasks, runs, repositories, runLogs, user } from '../../db/schema.js';
import { eq, and, ne, notLike, desc } from 'drizzle-orm';
import { getProvider } from '../core/registry.js';
import type { AgentDefinition, SandboxHandle, AgentRunConfig } from '../core/provider.js';
import { ResilientSandbox } from '../../sandbox/resilient-sandbox.js';
import { LocalExecSandbox } from '../../sandbox/local-exec.js';
import { FlySandbox } from '../../sandbox/fly-machine.js';
import { NotificationService } from '../../notifications/NotificationService.js';
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
import { broadcast } from '../../routes/ws.js';
import { applyFindingPolicy, decideGate } from '../policy/finding-policy.js';

export async function logAndBroadcast(
  type: string,
  payload: {
    repo: string;
    sha: string;
    agent: string;
    status: string;
    step?: string;
    runId?: number;
    score?: number | null;
    findingsCount?: number;
    error?: string;
    logType?: 'build' | 'run' | 'system';
    level?: 'ok' | 'err' | 'inf' | 'warn' | 'plain';
    message?: string;
  }
) {
  const tsMs = Date.now();
  // 1. Broadcast live WebSocket update
  broadcast(type, { ...payload, tsMs });

  // 2. Persist to Postgres run_logs table
  if (payload.runId) {
    try {
      const msg = payload.message || `[${payload.repo}] [${(payload.sha || '').slice(0, 7)}] ${payload.agent}: ${payload.status}`;
      const [run] = await db.select({ repoId: runs.repoId }).from(runs).where(eq(runs.id, payload.runId));
      if (run?.repoId) {
        await db.insert(runLogs).values({
          runId: payload.runId,
          repoId: run.repoId,
          agent: payload.agent,
          logType: payload.logType ?? 'run',
          level: payload.level ?? (type === 'agent_failed' ? 'err' : type === 'agent_completed' ? 'ok' : 'plain'),
          tsMs,
          message: msg,
          meta: { step: payload.step, score: payload.score, findingsCount: payload.findingsCount, error: payload.error },
        });
      }
    } catch (e) {
      console.error('[AgentWorker] Failed to persist runLog:', e);
    }
  }
}

dotenv.config();

// ---------------------------------------------------------------------------
// Connection (reuses the same Redis as the webhook queue)
// ---------------------------------------------------------------------------

const connection = createRedisConnection();

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export const agentQueue = new Queue('agent-jobs', {
  connection: connection as any,
  prefix: BULLMQ_PREFIX,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'custom',
    },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});

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
function createSandbox(): ResilientSandbox {
  return new ResilientSandbox();
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
    const [claimed] = await db
      .update(agentTasks)
      .set({
        status: 'running',
        startedAt: new Date(),
        completedAt: null, // Clear completion timestamp on retry
      })
      .where(eq(agentTasks.id, existing.id))
      .returning();
      
    return { taskId: claimed.id, checkpointState: claimed.checkpointState as any[] | null };
  }
  const [inserted] = await db.insert(agentTasks).values({
    runId,
    agentId,
    provider: providerName,
    status: 'running',
    startedAt: new Date(),
  }).returning();

  return { taskId: inserted.id, checkpointState: null };
}

// ---------------------------------------------------------------------------
// Orchestrator phase hand-off
// ---------------------------------------------------------------------------

/**
 * Builds the context block appended to an orchestrator phase's task prompt.
 *
 * The three phases previously shared one identical task prompt and communicated only through
 * the agent_tasks table, so Phase 2 never saw what Phase 1 ingested and Phase 3 never saw the
 * run it was deciding on. That is also why Phase 3's submit schema asked for facts — the branch,
 * the author, the elapsed time, the score trend, the risk profile — that no tool in its toolset
 * could answer: the data existed, it just never travelled. Rather than strip those fields out of
 * a schema the author clearly wanted populated, this hands the phase the real values so it can
 * fill them honestly instead of inventing them.
 */
async function buildOrchestratorContext(
  agentId: string,
  runId: number,
  sandbox: SandboxHandle,
  runRow: { repoId?: number | null; prNumber?: number | null; createdAt?: Date | null; scope?: unknown } | null | undefined,
  repoFullName: string,
  commitSHA: string,
): Promise<string> {
  if (!agentId.startsWith('orchestrator')) return '';

  const git = async (cmd: string): Promise<string | null> => {
    try {
      const res = await sandbox.exec(cmd);
      const out = (res.stdout ?? '').trim();
      return res.exitCode === 0 && out ? out : null;
    } catch { return null; }
  };

  const lines: string[] = [];

  if (agentId === 'orchestrator_phase2') {
    // Phase 1's ingestion output, persisted by analyse_commit_diff. Without this Phase 2 had to
    // re-derive from scratch what Phase 1 had already paid an LLM loop to work out.
    const ingestion = (runRow?.scope as any)?.ingestion;
    if (ingestion) {
      lines.push('=== PHASE 1 INGESTION RESULT (already computed — do not re-derive) ===');
      lines.push(JSON.stringify(ingestion).slice(0, 2000));
      lines.push('Use this to justify any override you pass to dispatch_recommended_agents. The tool');
      lines.push('re-derives the classification itself, so you do not need to repeat the analysis.');
    } else {
      lines.push('=== PHASE 1 INGESTION RESULT ===');
      lines.push('Not available for this run — dispatch_recommended_agents will derive it from the real diff itself.');
    }
  }

  if (agentId === 'orchestrator_phase3') {
    const [branch, authorEmail, committedAt] = await Promise.all([
      git('git rev-parse --abbrev-ref HEAD'),
      git('git log -1 --format=%ae'),
      git('git log -1 --format=%cI'),
    ]);

    const startedAt = runRow?.createdAt ? new Date(runRow.createdAt) : null;
    const totalDurationMs = startedAt ? Math.max(0, Date.now() - startedAt.getTime()) : null;

    // Prior completed run for this repo — the real source for scoreVsPriorRun / historicalTrend.
    let priorScore: number | null = null;
    let priorRunCount = 0;
    if (runRow?.repoId != null) {
      try {
        const prior = await db.select({ score: runs.score })
          .from(runs)
          .where(and(eq(runs.repoId, runRow.repoId), eq(runs.status, 'completed'), ne(runs.id, runId)))
          .orderBy(desc(runs.createdAt))
          .limit(5);
        priorRunCount = prior.length;
        priorScore = prior.find((r) => r.score != null)?.score ?? null;
      } catch { /* prior history is advisory; never fail the run over it */ }
    }

    const tasks = await db.select().from(agentTasks).where(
      and(eq(agentTasks.runId, runId), notLike(agentTasks.agentId, 'orchestrator%'))
    );

    lines.push('=== RUN FACTS (use these EXACT values; do not invent or estimate any of them) ===');
    lines.push(`runId: ${runId}`);
    lines.push(`repoId: ${runRow?.repoId ?? 'unknown'}`);
    lines.push(`repoFullName: ${repoFullName}`);
    lines.push(`commitSha: ${commitSHA}`);
    lines.push(`branch: ${branch ?? 'unknown — report "unknown", do not guess'}`);
    lines.push(`authorEmail: ${authorEmail ?? 'unknown — report "unknown", do not guess'}`);
    lines.push(`commitAuthoredAt: ${committedAt ?? 'unknown'}`);
    lines.push(`executedAt: ${startedAt ? startedAt.toISOString() : 'unknown'}`);
    lines.push(`completedAt: ${new Date().toISOString()}`);
    lines.push(`totalDurationMs: ${totalDurationMs ?? 'unknown — report 0 rather than guessing'}`);
    lines.push(`pullRequestNumber: ${runRow?.prNumber ?? 'none — this run is not attached to a PR'}`);
    lines.push(`priorCompletedRuns: ${priorRunCount}`);
    lines.push(`priorRunScore: ${priorScore ?? 'none — this is the first scored run, so scoreVsPriorRun is 0 and historicalTrend is "stable"'}`);

    const scope = (runRow?.scope as any) ?? {};
    if (scope.overallRisk || scope.isDocOrConfigOnly !== undefined) {
      lines.push('');
      lines.push('=== COMMIT RISK PROFILE (computed from the real diff at dispatch time) ===');
      lines.push(JSON.stringify({
        overallRisk: scope.overallRisk ?? null,
        isDocOrConfigOnly: scope.isDocOrConfigOnly ?? null,
        recommendedAgents: scope.recommendedAgents ?? null,
        dispatchedAgents: scope.dispatchedAgents ?? null,
        changedFilesSummary: scope.changedFilesSummary ?? null,
        ...(scope.ingestion?.riskProfile ?? {}),
      }).slice(0, 2000));
      lines.push('Populate commitRiskProfile from THIS. If a field is absent here, report a neutral');
      lines.push('value and say in your rationale that it was not measured — never fabricate one.');
    }

    lines.push('');
    lines.push('=== SUB-AGENT OUTCOMES (this run) ===');
    for (const t of tasks) {
      lines.push(`- ${t.agentId}: status=${t.status} score=${t.score ?? 'null'} findings=${t.findingsCount ?? 0}` +
        `${(t.reportMeta as any)?.truncated ? ' TRUNCATED (ran out of steps — its analysis is INCOMPLETE, not clean)' : ''}`);
    }
    if (tasks.length === 0) lines.push('- none recorded');
    lines.push('');
    lines.push('Call aggregate_results to get the validated findings and the policy verdict. An agent');
    lines.push('that is incomplete or failed has NOT verified its area — never describe that as a pass.');
  }

  return lines.length > 0 ? `\n\n${lines.join('\n')}` : '';
}

// ---------------------------------------------------------------------------
// Run Policy Gate (Phase 3)
// ---------------------------------------------------------------------------

export function evaluateRunPolicyGate(
  subAgentTasks: Array<{ agentId: string; status: string; findings?: any; reportMeta?: any }>,
  isDocOrConfigOnly: boolean = false
) {
  // Assessed per agent, not per run: the chain-of-custody list is only meaningful against the
  // agent that produced it, so pooling every run's findings first would let one agent's tool log
  // vouch for another agent's claims. Each task is judged against its own executed tools, then
  // the validated results are combined for the single max-based gate decision.
  const perAgent = subAgentTasks.map((t) => {
    const findings = ((t.findings as any[]) ?? []).map((f) => ({ ...f, agentId: t.agentId }));
    const executed = ((t.reportMeta as any)?.toolsExecuted ?? []) as Array<{ toolName?: string }>;
    const executedTools = Array.isArray(executed)
      ? executed.map((e) => String(e?.toolName ?? '')).filter(Boolean)
      : [];
    // An older task row with no recorded tool log is not evidence of fabrication — skip the
    // check for it rather than retroactively downgrading history.
    return applyFindingPolicy(findings, executedTools.length > 0 ? { executedTools } : {});
  });

  const assessed = perAgent.flatMap((p) => p.assessed);
  const surfaced = perAgent.flatMap((p) => p.surfaced);
  const suppressed = perAgent.flatMap((p) => p.suppressed);
  const unverifiedEvidenceCount = perAgent.reduce((n, p) => n + p.unverifiedEvidenceCount, 0);

  const gate = decideGate(assessed);
  const runPolicy = {
    decision: gate.decision as 'PASS' | 'WARN' | 'BLOCK',
    reasons: [...gate.reasons],
    surfacedFindings: surfaced.map((f: any) => ({
      agentId: String(f.agentId ?? 'unknown'),
      severity: String(f.severity ?? 'INFO'),
      title: String(f.title ?? 'Untitled finding'),
      file: f.file ?? null,
      line: f.line ?? null,
    })),
    suppressedCount: suppressed.length,
    unverifiedEvidenceCount,
  };

  // A-6: an agent that ran out of steps did NOT verify its area. The provider discards a
  // truncated agent's findings entirely (status 'incomplete', findings []), which made an
  // exhausted scan indistinguishable from a clean one — the run could reach PASS on the
  // strength of analysis that never finished. Extends the same fail-closed reasoning B-3
  // applies to security, at WARN rather than BLOCK: incomplete is unverified, not proven bad.
  const unfinished = subAgentTasks.filter((t) => t.status === 'incomplete' || t.status === 'failed');
  if (unfinished.length > 0 && runPolicy.decision === 'PASS') {
    runPolicy.decision = 'WARN';
    runPolicy.reasons.unshift(
      `[Incomplete Analysis] ${unfinished.map((t) => `${t.agentId} (${t.status})`).join(', ')} did not finish, ` +
      `so ${unfinished.length === 1 ? 'that area was' : 'those areas were'} never verified. This is not a clean pass.`
    );
  }

  // B-3: Security Fail-Open Hardening
  // The security agent is mandatory for all code runs. If it crashed, failed, was incomplete,
  // or was not run, we MUST fail closed (force decision = 'BLOCK') to prevent unverified code from being approved.
  if (!isDocOrConfigOnly) {
    const securityTask = subAgentTasks.find((t) => t.agentId === 'security');
    const isSecurityHealthy = securityTask && securityTask.status === 'completed';
    if (!isSecurityHealthy) {
      const statusDesc = securityTask ? securityTask.status : 'missing';
      console.warn(`[AgentWorker] [B-3 Fail-Closed] Mandatory security agent ended with status '${statusDesc}'. Forcing BLOCK.`);
      runPolicy.decision = 'BLOCK';
      runPolicy.reasons.unshift(
        `[Security Fail-Closed] Mandatory security agent ended with status '${statusDesc}'. PR cannot be approved without verified security analysis.`
      );
    }
  }

  return runPolicy;
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let _agentWorker: Worker<AgentJobData> | null = null;

export function startAgentWorker(customOpts?: any): Worker<AgentJobData> {
  if (_agentWorker) return _agentWorker;

  const parsedConcurrency = Number(process.env.WORKER_CONCURRENCY);
  const concurrency = Number.isSafeInteger(parsedConcurrency) && parsedConcurrency > 0 ? parsedConcurrency : 10;

  _agentWorker = new Worker('agent-jobs', async (job: Job<AgentJobData>) => {
  const { agentId, commitSHA, repoFullName, runId, provider: providerName, model } = job.data;

  console.log(`[AgentWorker] Starting ${agentId} for ${repoFullName}@${commitSHA} (run #${runId})`);

  const { taskId, checkpointState } = await claimTaskRow(runId, agentId, providerName);
  let sandbox: ResilientSandbox | null = null;
  let timeoutTimer: NodeJS.Timeout | null = null;

  try {
    const jobTimeoutMs = Number(process.env.AGENT_JOB_TIMEOUT_MS) || 15 * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        reject(new Error(`[AgentWorker] Job execution timed out after ${jobTimeoutMs}ms for agent ${agentId} on run #${runId}`));
      }, jobTimeoutMs);
    });

    const executeCore = async () => {
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
    // Real installation token for private repos — a real Fly.io test caught this: a clean
    // sandbox has NO git credentials of its own, so cloning a private repo with a bare HTTPS
    // URL fails outright ("could not read Username"). Every repo dispatched through here has a
    // real GitHub App installation (that's how guardian/fixer already authenticate); reuse it.
    let installationToken: string | undefined;
    const [repoForClone] = await db.select().from(repositories).where(eq(repositories.fullName, repoFullName));
    if (repoForClone?.installationId) {
      try {
        const { getInstallationToken } = await import('../../lib/github.js');
        installationToken = await getInstallationToken(repoForClone.installationId);
      } catch (tokenError) {
        console.warn(`[AgentWorker] Could not obtain an installation token for ${repoFullName} (falling back to unauthenticated clone, which will fail for private repos):`, (tokenError as Error).message);
      }
    }

    logAndBroadcast('agent_active', { repo: repoFullName, sha: commitSHA, agent: agentId, status: 'Initializing container...', step: 'init', runId, logType: 'build', level: 'plain', message: `[${repoFullName}] [${(commitSHA || '').slice(0, 7)}] ${agentId}: 📦 Initializing isolated sandbox container...` });

    sandbox = createSandbox();
    await sandbox.init(`https://github.com/${repoFullName}.git`, commitSHA, {}, installationToken);
    logAndBroadcast('agent_active', { repo: repoFullName, sha: commitSHA, agent: agentId, status: 'Cloned & Sandboxed', step: 'cloned', runId, logType: 'build', level: 'plain', message: `  ├─ 📦 Cloned & sandboxed repository workspace` });

    // -----------------------------------------------------------------------
    // 3. Build the tools
    // -----------------------------------------------------------------------
    const tools = definition.createTools(sandbox!);

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

    // Phase-to-phase hand-off. Empty for every non-orchestrator agent, so sub-agent prompts are
    // unchanged. Never allowed to fail the run — a missing context block degrades the orchestrator
    // to its previous behaviour rather than aborting the phase.
    let orchestratorContext = '';
    try {
      orchestratorContext = await buildOrchestratorContext(agentId, runId, sandbox!, runRow, repoFullName, commitSHA);
    } catch (ctxError) {
      console.warn(`[AgentWorker] Could not build orchestrator context for ${agentId} run #${runId}:`, (ctxError as Error).message);
    }

    // Incremental push runs carry a real changed-file scope computed by pushWorker from the
    // actual commit diff. Comprehensive (first-connect) runs have scope=null and get no
    // scoping instruction — they analyze the whole repo as before.
    const runScope = runRow?.scope as { incremental?: boolean; changedFiles?: string[] } | null;
    const scopeInstruction = runScope?.incremental && Array.isArray(runScope.changedFiles) && runScope.changedFiles.length > 0
      ? `\nINCREMENTAL RUN: this commit changed ONLY the following ${runScope.changedFiles.length} file(s):\n${runScope.changedFiles.map((f) => `  - ${f}`).join('\n')}\nScope your analysis to these files and their direct dependents. Do NOT run whole-repo scans when a tool lets you target specific files or directories — this run exists to check the new changes, not to re-audit the entire repository. Repo-wide facts you already know from memory (search_memory) do not need re-verification.`
      : '';
    if (scopeInstruction) {
      console.log(`[AgentWorker] ${agentId} run #${runId} is INCREMENTAL — scoped to ${runScope!.changedFiles!.length} changed file(s).`);
    }

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
Use these EXACT values for any tool parameter named runId/repoId — never invent, guess, or reuse a value from an example. This pipeline clones the repo and analyzes it statically — there is NO running instance of the app and NO live databaseUrl/baseUrl available. Tools that need one will honestly report applicable:false if you omit that argument; treat that as "not tested", never as "passed", and do not invent a placeholder connection string or URL to pass in. Follow your instructions precisely and report all findings as a JSON array.${scopeInstruction}${orchestratorContext}`,
      tools,
      maxSteps: definition.maxSteps,
      model: model || ((!runScope?.incremental || commitSHA === 'baseline') && process.env.INITIAL_SCAN_MODEL
        ? process.env.INITIAL_SCAN_MODEL
        : definition.defaultModel),
      commitSHA,
      repoFullName,
      runId,
      checkpointState: checkpointState || undefined,
    };

    // -----------------------------------------------------------------------
    // 5. Execute via the provider
    // -----------------------------------------------------------------------
    logAndBroadcast('agent_active', { repo: repoFullName, sha: commitSHA, agent: agentId, status: 'Running AST & Security Checks...', step: 'scanning', runId, logType: 'run', level: 'inf' });
    const provider = getProvider(providerName);
    const result = await provider.execute(config);

    // -----------------------------------------------------------------------
    // 6. Real auto-fix: for agents/categories proven safe (bloat's dead-code/unused-dep
    // findings only, for now), generate a real fix and open a real PR *before* persisting the
    // task row, so the PR outcome can be recorded in the same reportMeta write. A failure here
    // must never fail the agent's own already-successful analysis — it's a bonus action on top.
    // -----------------------------------------------------------------------
    let autoFixPR: any = null;
    const { AUTO_FIX_ELIGIBLE_AGENTS } = await import('../fixer/fixer.service.js');
    // Per-repo opt-out: analysis still ran and is reported, but users choose which repos they
    // trust to auto-fix. repoForClone was already loaded above for the clone token.
    const autoFixAllowed = repoForClone?.autoFixEnabled !== false;
    if (autoFixAllowed && AUTO_FIX_ELIGIBLE_AGENTS.has(agentId) && result.status !== 'error' && result.findings.length > 0 && runRow?.repoId != null) {
      logAndBroadcast('agent_active', { repo: repoFullName, sha: commitSHA, agent: agentId, status: 'Generating Auto-Fix PR...', step: 'autofix', runId, logType: 'run', level: 'warn' });
      try {
        const { openFixPR } = await import('../fixer/fixer.service.js');
        const outcome = await openFixPR({
          sandbox: sandbox!,
          repoId: String(runRow.repoId),
          repoFullName,
          runId,
          agentId,
          findings: result.findings as any[],
          onProgress: async (message, level) => {
            await logAndBroadcast('agent_active', {
              repo: repoFullName,
              sha: commitSHA,
              agent: agentId,
              status: message,
              step: 'autofix',
              runId,
              logType: 'run',
              level: level || 'inf',
              message: `[${repoFullName}] [${commitSHA.slice(0, 7)}] ${agentId} ${message}`,
            });
          },
        });
        autoFixPR = outcome;
        if (outcome.opened) {
          console.log(`[AgentWorker] ${agentId} opened a real auto-fix PR: ${outcome.htmlUrl} (${outcome.appliedFixes.length} fixes)`);
          await logAndBroadcast('agent_active', {
            repo: repoFullName,
            sha: commitSHA,
            agent: agentId,
            status: `Opened auto-fix PR #${outcome.pullRequestNumber}: ${outcome.htmlUrl}`,
            step: 'autofix',
            runId,
            logType: 'run',
            level: 'ok',
            message: `🚀 [${repoFullName}] [${commitSHA.slice(0, 7)}] ${agentId} opened auto-fix PR #${outcome.pullRequestNumber} (${outcome.appliedFixes.length} fix${outcome.appliedFixes.length === 1 ? '' : 'es'}): ${outcome.htmlUrl}`,
          });

          // Phase 2: guardian reviews the PR it was just told about — same real agentic review
          // it would give a human's PR. A failure here must not undo the already-real PR; it
          // just means the PR sits unreviewed by the bot, same as it would if this step didn't
          // exist yet.
          try {
            await logAndBroadcast('agent_active', {
              repo: repoFullName,
              sha: commitSHA,
              agent: 'guardian',
              status: `Reviewing auto-fix PR #${outcome.pullRequestNumber}...`,
              step: 'guardian_review',
              runId,
              logType: 'run',
              level: 'inf',
              message: `🛡️ [${repoFullName}] [${commitSHA.slice(0, 7)}] Guardian starting automated verification on PR #${outcome.pullRequestNumber}...`,
            });
            const { reviewFixPR } = await import('../guardian/review.service.js');
            const review = await reviewFixPR({
              sandbox: sandbox!,
              repoId: String(runRow.repoId),
              pullRequestNumber: outcome.pullRequestNumber,
              runId,
              agentId,
              appliedFixes: outcome.appliedFixes.map((f) => ({ filePath: f.filePath, rationale: f.rationale })),
            });
            autoFixPR = { ...outcome, guardianReview: review };
            if (review.reviewed) {
              console.log(`[AgentWorker] guardian reviewed PR #${outcome.pullRequestNumber}: ${review.event}`);
              await logAndBroadcast('agent_active', {
                repo: repoFullName,
                sha: commitSHA,
                agent: 'guardian',
                status: `PR #${outcome.pullRequestNumber} verdict: ${review.event}`,
                step: 'guardian_review',
                runId,
                logType: 'run',
                level: review.event === 'APPROVE' ? 'ok' : 'warn',
                message: `🛡️ [${repoFullName}] Guardian posted review on PR #${outcome.pullRequestNumber}: Verdict=${review.event} (${review.body || 'Verified clean and regression-free'})`,
              });
            } else {
              console.log(`[AgentWorker] guardian did not complete a review of PR #${outcome.pullRequestNumber}: ${review.reason}`);
              await logAndBroadcast('agent_active', {
                repo: repoFullName,
                sha: commitSHA,
                agent: 'guardian',
                status: `Review skipped on PR #${outcome.pullRequestNumber}: ${review.reason}`,
                step: 'guardian_review',
                runId,
                logType: 'run',
                level: 'warn',
                message: `🛡️ [${repoFullName}] Guardian review skipped on PR #${outcome.pullRequestNumber}: ${review.reason}`,
              });
            }

            // Phase 4: create the real merge-approval row for the dashboard, and schedule the
            // real timeout auto-merge when the repo has opted into auto mode. Severity of the
            // PR is the max severity across the findings it actually fixed.
            try {
              const { createApprovalAndMaybeSchedule } = await import('../merge/merge.queue.js');
              const fixedFiles = new Set(outcome.appliedFixes.map((f) => f.filePath));
              const severityRank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
              const maxSeverity = (result.findings as any[])
                .filter((f) => f.file && fixedFiles.has(f.file))
                .reduce<string | null>((max, f) => {
                  const sev = String(f.severity ?? '').toUpperCase();
                  return (severityRank[sev] ?? -1) > (max ? severityRank[max] : -1) ? sev : max;
                }, null);
              const approval = await createApprovalAndMaybeSchedule({
                repoId: runRow.repoId,
                runId,
                agentId,
                pullRequestNumber: outcome.pullRequestNumber,
                prUrl: outcome.htmlUrl,
                prTitle: `[Codeward] Auto-fix: ${outcome.appliedFixes.length} ${agentId} finding${outcome.appliedFixes.length === 1 ? '' : 's'} on run #${runId}`,
                guardianVerdict: review.reviewed ? review.event : null,
                maxSeverity,
              });
              autoFixPR = { ...autoFixPR, approvalId: approval.id, approvalMode: approval.mode, approvalDeadline: approval.deadlineAt };
              await logAndBroadcast('agent_active', {
                repo: repoFullName,
                sha: commitSHA,
                agent: agentId,
                status: `Registered merge approval for PR #${outcome.pullRequestNumber} (${approval.mode})`,
                step: 'merge_approval',
                runId,
                logType: 'run',
                level: 'ok',
                message: `⚖️ [${repoFullName}] Registered merge approval for PR #${outcome.pullRequestNumber} (Mode: ${approval.mode}, Severity: ${maxSeverity || 'NONE'})`,
              });
            } catch (approvalError) {
              console.error(`[AgentWorker] merge-approval creation threw (non-fatal, PR and review are unaffected):`, (approvalError as Error).message);
            }
          } catch (reviewError) {
            console.error(`[AgentWorker] guardian review step threw (non-fatal, PR is unaffected):`, (reviewError as Error).message);
            autoFixPR = { ...outcome, guardianReview: { reviewed: false, reason: `Review step crashed: ${(reviewError as Error).message}` } };
          }
        } else {
          console.log(`[AgentWorker] ${agentId} did not open an auto-fix PR: ${outcome.reason}`);
          await logAndBroadcast('agent_active', {
            repo: repoFullName,
            sha: commitSHA,
            agent: agentId,
            status: `Auto-fix skipped: ${outcome.reason}`,
            step: 'autofix',
            runId,
            logType: 'run',
            level: 'plain',
            message: `ℹ️ [${repoFullName}] [${commitSHA.slice(0, 7)}] ${agentId} auto-fix skipped: ${outcome.reason}`,
          });
        }
      } catch (fixError) {
        console.error(`[AgentWorker] ${agentId} auto-fix step threw (non-fatal, analysis result is unaffected):`, (fixError as Error).message);
        autoFixPR = { opened: false, reason: `Auto-fix step crashed: ${(fixError as Error).message}` };
        await logAndBroadcast('agent_active', {
          repo: repoFullName,
          sha: commitSHA,
          agent: agentId,
          status: `Auto-fix error: ${(fixError as Error).message}`,
          step: 'autofix',
          runId,
          logType: 'run',
          level: 'err',
          message: `❌ [${repoFullName}] [${commitSHA.slice(0, 7)}] ${agentId} auto-fix error: ${(fixError as Error).message}`,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 6b. Real escalation (Phase 6, partial): when the orchestrator's final decision for the
    // whole run is BLOCK, open real GitHub issues for whatever CRITICAL/HIGH findings across
    // every agent are still genuinely unresolved (not dismissed, not already auto-fixed), and
    // send a real alert email to the repo's owner. This is the "agents that can't fix it
    // escalate" path — orchestrator Phase 3 is the natural trigger since it's the one place
    // that makes ONE decision for the whole run, after every agent has reported.
    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // 6a. The run's authoritative gate decision, computed by the backend policy engine from
    // every sub-agent's persisted findings — not taken from the model's own gateDecision.
    // A model that decides it wants to block must still produce findings that survive the
    // evidence and confidence checks; conversely a model that stayed quiet cannot wave
    // through a critical that did survive them. Phase 3 is the one point in the pipeline
    // where the complete, validated finding set for the run exists, so the decision that
    // reaches escalation, guardian and the GitHub check run is made here, once.
    // -----------------------------------------------------------------------
    let runPolicy: {
      decision: 'PASS' | 'WARN' | 'BLOCK';
      reasons: string[];
      surfacedFindings: Array<{ agentId: string; severity: string; title: string; file: string | null; line: number | null }>;
      suppressedCount: number;
      unverifiedEvidenceCount: number;
    } | null = null;

    if (agentId === 'orchestrator_phase3') {
      try {
        const subAgentTasks = await db.select().from(agentTasks).where(
          and(eq(agentTasks.runId, runId), notLike(agentTasks.agentId, 'orchestrator%'))
        );
        const [run] = await db.select({ scope: runs.scope }).from(runs).where(eq(runs.id, runId));
        const scope = run?.scope as any;
        const isDocOrConfigOnly = scope?.isDocOrConfigOnly === true;

        runPolicy = evaluateRunPolicyGate(subAgentTasks as any, isDocOrConfigOnly);
        console.log(
          `[AgentWorker] Run #${runId} policy gate: ${runPolicy.decision} — ${runPolicy.surfacedFindings.length} surfaced, ${runPolicy.suppressedCount} suppressed` +
          `${runPolicy.unverifiedEvidenceCount ? `, ${runPolicy.unverifiedEvidenceCount} with unverified tool evidence` : ''}` +
          ` of ${subAgentTasks.length} subagents (model said: ${result.gateDecision ?? 'none'}).`
        );
      } catch (policyError) {
        const message = (policyError as Error).message;
        console.error(`[AgentWorker] Finding policy evaluation failed for run #${runId}:`, message);
        // B-3 Fail-Closed: a gate we could not evaluate is not a gate that passed. Force BLOCK
        // rather than deferring to the model's own decision, so an error in the policy layer
        // can never approve a run whose findings were never validated.
        runPolicy = {
          decision: 'BLOCK',
          reasons: [`[Policy Fail-Closed] Run policy evaluation failed (${message}). Blocking because the run could not be verified.`],
          surfacedFindings: [],
          suppressedCount: 0,
          unverifiedEvidenceCount: 0,
        };
      }
    }

    // The gate that drives every developer-facing action below. Always the policy's decision
    // for phase 3 — including when the policy evaluation itself threw, which forces BLOCK above.
    const effectiveGateDecision = runPolicy ? runPolicy.decision : result.gateDecision;

    let escalation: any = null;
    if (agentId === 'orchestrator_phase3' && effectiveGateDecision === 'BLOCK' && runRow?.repoId != null) {
      try {
        const { escalationQueue } = await import('../escalation/escalation.queue.js');
        const escalationJob = await escalationQueue.add(`escalate-${runId}`, {
          runId,
          repoId: runRow.repoId,
          repoFullName,
        }, {
          jobId: `escalate-${runId}`,
        });
        escalation = { queued: true, jobId: escalationJob.id, runId };
        console.log(`[AgentWorker] Enqueued escalation job #${escalationJob.id} to escalationQueue for run #${runId}.`);
      } catch (enqueueError) {
        console.error(`[AgentWorker] Failed to enqueue escalation job for run #${runId}:`, (enqueueError as Error).message);
        escalation = { queued: false, error: (enqueueError as Error).message };
      }
    }

    // -----------------------------------------------------------------------
    // 6c. Guardian reviews the HUMAN-opened PR (Phase 2 of the moat, human side). When this run
    // analyzed a real pull request (runRow.prNumber set by the webhook), guardian posts a real
    // review on the developer's PR using every agent's aggregated findings — the same reasoning
    // it applies to Codeward's own auto-fix PRs, now pointed at human work.
    // -----------------------------------------------------------------------
    let humanPrReview: any = null;
    if (agentId === 'orchestrator_phase3' && runRow?.prNumber != null && runRow.repoId != null) {
      try {
        // Guardian only ever sees findings that cleared the policy. Previously every finding
        // in the run was handed over verbatim, including INFO-level style notes, so anything
        // an agent emitted could become a comment on a developer's pull request.
        const findings = runPolicy?.surfacedFindings ?? [];
        const { reviewHumanPR } = await import('../guardian/review.service.js');
        const review = await reviewHumanPR({
          sandbox: sandbox!, repoId: String(runRow.repoId), pullRequestNumber: runRow.prNumber, runId,
          findings, gateDecision: effectiveGateDecision ?? null,
        });
        humanPrReview = review;
        console.log(`[AgentWorker] guardian human-PR review of #${runRow.prNumber}: ${review.reviewed ? review.event : `did not complete (${review.reason})`}`);
      } catch (reviewError) {
        console.error(`[AgentWorker] human-PR review step threw (non-fatal):`, (reviewError as Error).message);
        humanPrReview = { reviewed: false, reason: `Review step crashed: ${(reviewError as Error).message}` };
      }
    }

    // Complete the same GitHub Check Run and initial status comment created at webhook time.
    // This is deliberately deterministic rather than relying on a model to remember an API call.
    if (agentId === 'orchestrator_phase3' && runRow?.prNumber != null) {
      try {
        const { completePrLifecycle } = await import('../../services/github-pr-lifecycle.service.js');
        const decision = String(effectiveGateDecision ?? 'COMMENT');
        const conclusion = decision === 'APPROVE' || decision === 'PASS' ? 'success' : decision === 'BLOCK' ? 'failure' : 'neutral';
        await completePrLifecycle(runId, {
          conclusion,
          title: `Codeward review · ${decision}`,
          summary: runPolicy?.reasons.length
            ? `${runPolicy.reasons.slice(0, 5).join('\n')}`
            : (result as any).rationale ?? `Codeward completed its review with decision: ${decision}.`,
        });
      } catch (lifecycleError) {
        console.error(`[AgentWorker] Could not complete PR lifecycle for run #${runId}:`, (lifecycleError as Error).message);
      }
    }

    // -----------------------------------------------------------------------
    // 6d. Mark the repo active once its real FIRST scan completes. A full user-journey audit
    // found nothing ever did this: repositories.status stayed 'pending_audit' forever, which
    // also silently stalled every later push (pushWorker re-queues with a delay whenever
    // status !== 'active'). Guarded by the WHERE clause so this only ever fires once per repo
    // — a harmless no-op on every subsequent run.
    // -----------------------------------------------------------------------
    if (agentId === 'orchestrator_phase3' && result.status !== 'error' && runRow?.repoId != null) {
      try {
        await db.update(repositories).set({
          status: 'active', auditCompletedAt: new Date(), baselineScore: result.score ?? null,
        }).where(and(eq(repositories.id, runRow.repoId), eq(repositories.status, 'pending_audit')));
      } catch (activationError) {
        console.error(`[AgentWorker] Could not activate repoId ${runRow.repoId} (non-fatal):`, (activationError as Error).message);
      }
    }

    // -----------------------------------------------------------------------
    // 6e. Reconcile runs.score with the SAME real result.score every agent's row uses. A real
    // discrepancy was found live: store_orchestrator_result (a separate tool call, populated
    // from a model-supplied nested `result` object) had set runs.score=0 for a run whose real
    // computed score — now correctly extracted in openai.provider.ts — was 100. Two tools
    // writing "the score" from two different sources will drift; this makes agent.queue.ts the
    // one place that writes it, using the same result.score already trusted everywhere else.
    // -----------------------------------------------------------------------
    if (agentId === 'orchestrator_phase3' && result.status !== 'error') {
      try {
        const finalScore = result.status === 'incomplete' ? null : (result.score ?? null);
        await db.update(runs).set({ score: finalScore }).where(eq(runs.id, runId));
      } catch (scoreError) {
        console.error(`[AgentWorker] Could not reconcile runs.score for run #${runId} (non-fatal):`, (scoreError as Error).message);
      }
    }

    // -----------------------------------------------------------------------
    // 7. Write results to the database
    // -----------------------------------------------------------------------
    await db.update(agentTasks)
      .set({
        status: result.status === 'error' ? 'failed' : result.status === 'incomplete' ? 'incomplete' : 'completed',
        score: result.status === 'incomplete' ? null : result.score,
        findingsCount: result.findings.length,
        findings: result.findings,
        reportMeta: {
          gateDecision: effectiveGateDecision ?? null,
          modelGateDecision: result.gateDecision ?? null,
          policy: result.policy ?? null,
          runPolicy: runPolicy ? { decision: runPolicy.decision, suppressedCount: runPolicy.suppressedCount, surfacedCount: runPolicy.surfacedFindings.length } : null,
          toolsExecuted: result.toolsExecuted ?? [], summary: result.summary ?? null, autoFixPR, escalation, humanPrReview,
          // The agent's structured report minus findings — makes broken_code's testSuiteResult /
          // migrationRollbackPassed (and every other agent's top-level facts) readable by
          // aggregate_results and the dashboard instead of being discarded at the provider.
          report: (result as any).report ?? null,
          // Which cascade candidate actually served the run. Without it the token counts cannot
          // be priced, since the fallbacks bill at very different rates than OpenAI direct.
          servedBy: result.servedBy ?? null,
          truncated: (result as any).truncated ?? false,
        },
        model: result.modelUsed,
        tokenUsage: {
          input: result.tokenUsage?.input ?? 0,
          output: result.tokenUsage?.output ?? 0,
          total: result.tokenUsage?.total ?? ((result.tokenUsage?.input ?? 0) + (result.tokenUsage?.output ?? 0)),
          cachedInput: result.tokenUsage?.cachedInput ?? 0,
          reportedSteps: result.tokenUsage?.reportedSteps ?? 0,
          unreportedSteps: result.tokenUsage?.unreportedSteps ?? 0,
          // Distinguishes "this run was free" from "nobody told us what it cost".
          complete: (result.tokenUsage?.unreportedSteps ?? 0) === 0,
        },
        duration: result.duration,
        completedAt: new Date(),
      })
      .where(eq(agentTasks.id, taskId));

    console.log(`[AgentWorker] ${agentId} completed: score=${result.score}, findings=${result.findings.length}, duration=${result.duration}ms`);

    // Increment real-time leaderboard stats if auto-fixes were generated
    if (runRow?.repoId != null && autoFixPR?.opened && autoFixPR?.appliedFixes?.length) {
      try {
        const { recordLeaderboardContribution } = await import('../../services/leaderboard.service.js');
        await recordLeaderboardContribution({
          repoId: runRow.repoId,
          runId,
          appliedFixes: autoFixPR.appliedFixes.length,
        });
      } catch (leaderboardError) {
        console.error(`[AgentWorker] Failed to record leaderboard contribution (non-fatal):`, leaderboardError);
      }
    }
    logAndBroadcast('agent_completed', {
      repo: repoFullName,
      sha: commitSHA,
      agent: agentId,
      status: 'Completed',
      score: result.score,
      findingsCount: result.findings.length,
      step: 'done',
      runId,
      logType: 'run',
      level: 'ok',
      message: `✅ [${repoFullName}] [${(commitSHA || '').slice(0, 7)}] ${agentId} finished (Score: ${result.score ?? 100}/100, Findings: ${result.findings.length})`,
    });

      return result;
    };

    return await Promise.race([executeCore(), timeoutPromise]);

  } catch (error) {
    const err = error as Error;
    console.error(`[AgentWorker] ${agentId} failed (Attempt ${job.attemptsMade + 1}):`, err.message);

    const msg = err.message.toLowerCase();
    const isDeterministic = msg.includes('insufficient_quota') ||
      msg.includes('credits remaining') ||
      msg.includes('401') ||
      msg.includes('repository not found') ||
      msg.includes('could not read username') ||
      msg.includes('syntaxerror') ||
      msg.includes('timed out');

    const maxAttempts = job.opts.attempts || 3;
    const willRetry = !isDeterministic && (job.attemptsMade + 1 < maxAttempts);
    
    const checkpointState = (error as any).checkpointState || null;

    if (willRetry) {
      const retryMsg = `Transient issue encountered. Pausing and retrying with backoff (Attempt ${job.attemptsMade + 2} of ${maxAttempts}) - ${err.message}`;
      console.log(`[AgentWorker] ${agentId} - ${retryMsg}`);
      logAndBroadcast('agent_active', { repo: repoFullName, sha: commitSHA, agent: agentId, status: retryMsg, step: 'retrying', runId, logType: 'system', level: 'warn' });
      
      if (checkpointState) {
        await db.update(agentTasks).set({ checkpointState }).where(eq(agentTasks.id, taskId));
      }
    } else {
      // Final failure or deterministic
      logAndBroadcast('agent_failed', { repo: repoFullName, sha: commitSHA, agent: agentId, status: 'Failed', error: err.message, step: 'error', runId, logType: 'run', level: 'err' });

      // Mark as failed in the database and save checkpoint
      await db.update(agentTasks)
        .set({
          status: 'failed',
          error: err.message,
          checkpointState,
          completedAt: new Date(),
        })
        .where(eq(agentTasks.id, taskId));
      
      // Since it's a final failure, trigger the email notification here with precision deep link
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const retryUrl = `${frontendUrl}/dashboard/repositories?retryRepo=${encodeURIComponent(repoFullName)}&runId=${runId}`;
        const logTail = err.message + '\n' + (err.stack || '');
        
        // We look up the organization owner's email. For now, since we have repoFullName,
        // we can fetch the user associated with the repo.
        const [runRowCatch] = await db.select().from(runs).where(eq(runs.id, runId));
        if (runRowCatch?.repoId) {
          const [repoOwner] = await db
            .select({ email: user.email })
            .from(repositories)
            .innerJoin(user, eq(repositories.userId, user.id))
            .where(eq(repositories.id, runRowCatch.repoId));

          if (repoOwner?.email) {
            const { NotificationService } = await import('../../notifications/NotificationService.js');
            await NotificationService.sendRunFailure(
              repoOwner.email,
              repoFullName,
              agentId,
              runId,
              commitSHA,
              err.message,
              retryUrl,
              logTail.substring(0, 2000)
            );
          }
        }
      } catch (emailErr) {
        console.error(`[AgentWorker] Failed to send failure email for ${agentId}:`, emailErr);
      }
    }

    if (isDeterministic) {
      throw new UnrecoverableError(`Deterministic failure: ${err.message}`);
    }
    
    throw error; // Re-throw so BullMQ can handle retries (or move to failed if exhausted)
  } finally {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
    }
    if (sandbox) {
      await (sandbox as any).destroy();
      logAndBroadcast('agent_active', {
        repo: repoFullName,
        sha: commitSHA,
        agent: agentId,
        status: 'Sandbox cleaned',
        step: 'cleanup',
        runId,
        logType: 'system',
        level: 'plain',
        message: `  └─ 🧹 Destroyed & cleaned isolated sandbox container`,
      });
    }
  }

  }, {
    connection: connection as any,
    prefix: BULLMQ_PREFIX,
    concurrency,
    lockDuration: 300000,
    settings: {
      backoffStrategy: customBackoffStrategy,
    },
    ...customOpts,
  });

  _agentWorker.on('active', (job) => {
    broadcast('agent_active', {
      repo: job.data.repoFullName,
      sha: job.data.commitSHA,
      agent: job.data.agentId,
      status: 'Running'
    });
  });

  const MANDATORY_AGENTS = ['security'];

  async function ensureMandatoryAgentsSpawned(runId: number, repoFullName: string, commitSHA: string): Promise<boolean> {
    const [run] = await db.select({ scope: runs.scope }).from(runs).where(eq(runs.id, runId));
    const scope = run?.scope as any;
    // If diff analysis concluded doc-only / non-code change, security is not mandatory
    if (scope?.isDocOrConfigOnly) {
      return false;
    }

    const existing = await db.select().from(agentTasks).where(eq(agentTasks.runId, runId));
    const existingIds = new Set(existing.map((t: any) => t.agentId));
    const missing = MANDATORY_AGENTS.filter((a) => !existingIds.has(a));
    if (missing.length === 0) return false;

    for (const agentId of missing) {
      console.warn(`[Orchestrator] Phase 2 did not spawn mandatory agent '${agentId}' for run #${runId} — spawning it now as a code-level backstop (this should be rare; check Phase 2's reasoning if it happens often).`);
      await agentQueue.add(`agent-${agentId}`, { agentId, commitSHA, repoFullName, runId }, { jobId: `mandatory-${agentId}-${runId}` });
    }
    return true;
  }

  async function checkAndTriggerPhase3(runId: number, repoFullName: string, commitSHA: string) {
    const [phase2] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, 'orchestrator_phase2')));
    if (!phase2 || phase2.status === 'queued' || phase2.status === 'running') return;

    // A-5: a backstop spawn used to return unconditionally, so if that spawn threw, nothing
    // ever re-triggered Phase 3 and the run hung until the sweeper collected it. A failure to
    // spawn now falls through to the pending check instead of stranding the run.
    let spawnedMandatory = false;
    try {
      spawnedMandatory = await ensureMandatoryAgentsSpawned(runId, repoFullName, commitSHA);
    } catch (spawnError) {
      console.error(`[Orchestrator] Mandatory-agent backstop failed for run #${runId}; continuing so Phase 3 can still be reached:`, (spawnError as Error).message);
    }
    if (spawnedMandatory) return;

    const remaining = await db.select().from(agentTasks).where(
      and(eq(agentTasks.runId, runId), notLike(agentTasks.agentId, 'orchestrator%'))
    );
    const stillPending = remaining.filter((t: any) => t.status === 'queued' || t.status === 'running');
    if (stillPending.length > 0) return;

    console.log(`[Orchestrator] All ${remaining.length} sub-agents terminal for run #${runId}. Triggering Phase 3 (Decision).`);
    await agentQueue.add('orchestrator-phase3', {
      agentId: 'orchestrator_phase3',
      commitSHA,
      repoFullName,
      runId
    }, { jobId: `phase3-${runId}` });
  }

  _agentWorker.on('completed', async (job) => {
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
      await agentQueue.add('orchestrator-phase2', {
        agentId: 'orchestrator_phase2',
        commitSHA: job.data.commitSHA,
        repoFullName: job.data.repoFullName,
        runId: job.data.runId
      });
    } else if (job.data.agentId === 'orchestrator_phase2') {
      console.log(`[Orchestrator] Phase 2 complete. Checking whether any dispatched sub-agents already finished before this handler ran.`);
      await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
    } else if (job.data.agentId === 'orchestrator_phase3') {
      console.log(`[Orchestrator] Phase 3 complete for run #${job.data.runId} (${job.data.repoFullName}).`);
      try {
        const [currentRepo] = await db.select().from(repositories)
          .where(eq(repositories.fullName, job.data.repoFullName));

        if (currentRepo) {
          const score = job.returnvalue?.score ?? currentRepo.baselineScore ?? 88;
          await db.update(repositories)
            .set({ status: 'active', auditCompletedAt: new Date(), baselineScore: score })
            .where(eq(repositories.id, currentRepo.id));

          // Send baseline completion success email
          const [repoOwner] = await db.select().from(user).where(eq(user.id, currentRepo.userId));
          if (repoOwner?.email) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const dashboardUrl = `${frontendUrl}/dashboard`;
            await NotificationService.sendRepoConnectedSuccess(
              repoOwner.email,
              currentRepo.fullName,
              score,
              dashboardUrl
            );
          }

          // Sequentially dequeue next repository per policy
          const [nextQueued] = await db.select().from(repositories)
            .where(and(
              eq(repositories.userId, currentRepo.userId),
              eq(repositories.status, 'queued')
            ))
            .orderBy(repositories.createdAt)
            .limit(1);

          if (nextQueued) {
            console.log(`[AgentQueue] Dequeueing next repository in sequence: ${nextQueued.fullName}`);
            await db.update(repositories)
              .set({ status: 'pending_audit', auditTriggeredAt: new Date() })
              .where(eq(repositories.id, nextQueued.id));

            const { triggerComprehensiveAudit } = await import('../audit-trigger.js');
            await triggerComprehensiveAudit(nextQueued.id, nextQueued.fullName);

            if (repoOwner?.email) {
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
              const streamUrl = `${frontendUrl}/dashboard/livefeed?view=stream`;
              const remaining = await db.select().from(repositories)
                .where(and(
                  eq(repositories.userId, currentRepo.userId),
                  eq(repositories.status, 'queued')
                ));

              await NotificationService.sendQueuedRepoStarted({
                to: repoOwner.email,
                userName: repoOwner.name || 'Engineer',
                previousRepo: currentRepo.fullName,
                activeRepo: nextQueued.fullName,
                remainingQueuedRepos: remaining.map(r => r.fullName),
                streamUrl,
              });
            }
          }
        }
      } catch (dequeueErr: any) {
        console.error('[AgentQueue] Error handling sequential repo dequeue:', dequeueErr?.message);
      }
    } else if (!job.data.agentId.startsWith('orchestrator')) {
      await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
    }
  });

  _agentWorker.on('failed', async (job, err) => {
    console.error(`[AgentQueue] Job ${job?.id} failed (${job?.data?.agentId}):`, err.message);
    if (job?.data && !job.data.agentId.startsWith('orchestrator')) {
      await checkAndTriggerPhase3(job.data.runId, job.data.repoFullName, job.data.commitSHA);
    } else if (job?.data && job.data.agentId.startsWith('orchestrator')) {
      // An orchestrator phase died terminally (sandbox boot failure, OOM, unhandled throw). The
      // sequential queue was already released below, but nothing ever closed out the run itself:
      // `runs` stayed 'running' and the repository stayed locked in 'pending_audit' forever, so the
      // dashboard showed a permanently spinning run and pushWorker re-queued every later commit
      // behind a repo that never became active again. Close both out here, before advancing the
      // queue, so the deadlock cannot survive the crash that caused it.
      const { runId, repoFullName } = job.data;
      try {
        if (runId) {
          // 'failed' — not 'error' — because that is the vocabulary the rest of the system reads:
          // the dashboard's status tone map and CommitHistory's "view report" gate both recognise
          // 'failed', and an unknown status would hide the report for exactly the runs that need it.
          await db.update(runs)
            .set({ status: 'failed' })
            .where(and(eq(runs.id, runId), ne(runs.status, 'completed')));
        }
        if (repoFullName) {
          // Only lift the audit lock; a repo the user paused or that was never activated is left alone.
          await db.update(repositories)
            .set({ status: 'active' })
            .where(and(eq(repositories.fullName, repoFullName), eq(repositories.status, 'pending_audit')));
        }
        console.warn(`[AgentQueue] Orchestrator failure cleanup: run #${runId} marked failed, ${repoFullName} unlocked.`);
      } catch (cleanupErr: any) {
        console.error(`[AgentQueue] Could not close out run #${runId} after orchestrator failure:`, cleanupErr?.message);
      }

      // Unlock sequential queue so the next repo is not deadlocked
      try {
        const { advanceSequentialQueue } = await import('./sweeper.service.js');
        await advanceSequentialQueue();
      } catch (seqErr: any) {
        console.warn(`[AgentQueue] Could not auto-advance sequential queue after orchestrator failure:`, seqErr?.message);
      }
    }
    broadcast('agent_failed', {
      repo: job?.data?.repoFullName || 'unknown',
      sha: job?.data?.commitSHA || 'unknown',
      agent: job?.data?.agentId || 'unknown',
      status: 'Failed',
      error: err.message
    });
  });

  return _agentWorker;
}

export const agentWorker = new Proxy({} as Worker<AgentJobData>, {
  get(target, prop, receiver) {
    const worker = startAgentWorker();
    const val = Reflect.get(worker, prop, receiver);
    return typeof val === 'function' ? val.bind(worker) : val;
  },
});
