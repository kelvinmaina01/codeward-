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
import { agentTasks, runs, repositories } from '../../db/schema.js';
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

    sandbox = createSandbox();
    await sandbox.init(`https://github.com/${repoFullName}.git`, commitSHA, {}, installationToken);

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
Use these EXACT values for any tool parameter named runId/repoId — never invent, guess, or reuse a value from an example. This pipeline clones the repo and analyzes it statically — there is NO running instance of the app and NO live databaseUrl/baseUrl available. Tools that need one will honestly report applicable:false if you omit that argument; treat that as "not tested", never as "passed", and do not invent a placeholder connection string or URL to pass in. Follow your instructions precisely and report all findings as a JSON array.${scopeInstruction}`,
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
      try {
        const { openFixPR } = await import('../fixer/fixer.service.js');
        const outcome = await openFixPR({
          sandbox: sandbox!,
          repoId: String(runRow.repoId),
          repoFullName,
          runId,
          agentId,
          findings: result.findings as any[],
        });
        autoFixPR = outcome;
        if (outcome.opened) {
          console.log(`[AgentWorker] ${agentId} opened a real auto-fix PR: ${outcome.htmlUrl} (${outcome.appliedFixes.length} fixes)`);

          // Phase 2: guardian reviews the PR it was just told about — same real agentic review
          // it would give a human's PR. A failure here must not undo the already-real PR; it
          // just means the PR sits unreviewed by the bot, same as it would if this step didn't
          // exist yet.
          try {
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
            } else {
              console.log(`[AgentWorker] guardian did not complete a review of PR #${outcome.pullRequestNumber}: ${review.reason}`);
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
            } catch (approvalError) {
              console.error(`[AgentWorker] merge-approval creation threw (non-fatal, PR and review are unaffected):`, (approvalError as Error).message);
            }
          } catch (reviewError) {
            console.error(`[AgentWorker] guardian review step threw (non-fatal, PR is unaffected):`, (reviewError as Error).message);
            autoFixPR = { ...outcome, guardianReview: { reviewed: false, reason: `Review step crashed: ${(reviewError as Error).message}` } };
          }
        } else {
          console.log(`[AgentWorker] ${agentId} did not open an auto-fix PR: ${outcome.reason}`);
        }
      } catch (fixError) {
        console.error(`[AgentWorker] ${agentId} auto-fix step threw (non-fatal, analysis result is unaffected):`, (fixError as Error).message);
        autoFixPR = { opened: false, reason: `Auto-fix step crashed: ${(fixError as Error).message}` };
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
    let escalation: any = null;
    if (agentId === 'orchestrator_phase3' && result.gateDecision === 'BLOCK' && runRow?.repoId != null) {
      try {
        const { escalateUnresolvedFindings } = await import('../escalation/escalation.service.js');
        const outcome = await escalateUnresolvedFindings({ sandbox: sandbox!, repoId: String(runRow.repoId), runId });
        escalation = outcome;
        console.log(`[AgentWorker] escalation for run #${runId}: ${outcome.escalated.length} real issue(s) opened, ${outcome.skipped.length} skipped.`);

        if (outcome.escalated.length > 0) {
          try {
            const { db: db2 } = await import('../../db/index.js');
            const { repositories: repositories2, user: user2 } = await import('../../db/schema.js');
            const { eq: eq2 } = await import('drizzle-orm');
            const [repo] = await db2.select().from(repositories2).where(eq2(repositories2.id, runRow.repoId));
            const [owner] = repo ? await db2.select().from(user2).where(eq2(user2.id, repo.userId)) : [];
            if (owner?.email) {
              const { NotificationService } = await import('../../notifications/NotificationService.js');
              const first = outcome.escalated[0];
              await NotificationService.sendEscalation(
                owner.email, repoFullName, first.issueNumber, first.title,
                `${outcome.escalated.length} unresolved finding(s) across ${new Set(outcome.escalated.map((e: any) => e.agentId)).size} agent(s)`,
                String(runId)
              );
              console.log(`[AgentWorker] real escalation alert sent to ${owner.email}`);
            } else {
              console.warn(`[AgentWorker] escalation issues created but no real owner email found for repoId ${runRow.repoId} — alert not sent.`);
            }
          } catch (emailError) {
            console.error(`[AgentWorker] escalation email failed (non-fatal, issues were still created):`, (emailError as Error).message);
          }
        }
      } catch (escalationError) {
        console.error(`[AgentWorker] escalation step threw (non-fatal, orchestrator decision is unaffected):`, (escalationError as Error).message);
        escalation = { escalated: [], skipped: [], error: (escalationError as Error).message };
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
        const allTasks = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), notLike(agentTasks.agentId, 'orchestrator%')));
        const findings = allTasks.flatMap((t) => ((t.findings as any[]) ?? []).map((f) => ({
          agentId: t.agentId, severity: String(f.severity ?? 'INFO'), title: f.title, file: f.file ?? null, line: f.line ?? null,
        })));
        const { reviewHumanPR } = await import('../guardian/review.service.js');
        const review = await reviewHumanPR({
          sandbox: sandbox!, repoId: String(runRow.repoId), pullRequestNumber: runRow.prNumber, runId,
          findings, gateDecision: result.gateDecision ?? null,
        });
        humanPrReview = review;
        console.log(`[AgentWorker] guardian human-PR review of #${runRow.prNumber}: ${review.reviewed ? review.event : `did not complete (${review.reason})`}`);
      } catch (reviewError) {
        console.error(`[AgentWorker] human-PR review step threw (non-fatal):`, (reviewError as Error).message);
        humanPrReview = { reviewed: false, reason: `Review step crashed: ${(reviewError as Error).message}` };
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
        await db.update(runs).set({ score: result.score ?? null }).where(eq(runs.id, runId));
      } catch (scoreError) {
        console.error(`[AgentWorker] Could not reconcile runs.score for run #${runId} (non-fatal):`, (scoreError as Error).message);
      }
    }

    // -----------------------------------------------------------------------
    // 7. Write results to the database
    // -----------------------------------------------------------------------
    await db.update(agentTasks)
      .set({
        status: result.status === 'error' ? 'failed' : 'completed',
        score: result.score,
        findingsCount: result.findings.length,
        findings: result.findings,
        reportMeta: { gateDecision: result.gateDecision ?? null, toolsExecuted: result.toolsExecuted ?? [], summary: result.summary ?? null, autoFixPR, escalation, humanPrReview },
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
// Mandatory agents that must run on EVERY commit, enforced in code — not left to Phase 2's
// discretion. Real evidence this backstop is needed: a live run dispatched every agent it
// felt like on a 1-file docs change, so "the model will surely remember" isn't a safe
// assumption for a non-negotiable rule. Keep this list in sync with analyse_commit_diff's
// mandatory:true entries in orchestrator.tools.ts.
const MANDATORY_AGENTS = ['security'];

async function ensureMandatoryAgentsSpawned(runId: number, repoFullName: string, commitSHA: string): Promise<boolean> {
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

// Exported (not just internal) so the mandatory-agent backstop can be exercised directly in a
// real test without paying for a full LLM-driven Phase 2 run just to prove a pure DB-logic path.
export async function checkAndTriggerPhase3(runId: number, repoFullName: string, commitSHA: string) {
  const [phase2] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, runId), eq(agentTasks.agentId, 'orchestrator_phase2')));
  if (!phase2 || phase2.status === 'queued' || phase2.status === 'running') return;

  const spawnedMandatory = await ensureMandatoryAgentsSpawned(runId, repoFullName, commitSHA);
  if (spawnedMandatory) return; // let the newly-spawned job's own completion event re-trigger this check

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
