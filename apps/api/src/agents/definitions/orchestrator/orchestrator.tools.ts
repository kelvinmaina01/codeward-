import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createMemoryTools } from '../../tools/memory.tools.js';
import { assessFinding } from '../../policy/finding-policy.js';
import { scanDiff, type FloorResult, type SignatureClass } from './deterministic-floor.js';
import { MODEL_TIER } from '../../../providers/engine.provider.js';

export interface AgentRecommendation { agentType: string; recommend: boolean; mandatory: boolean; reason: string }

export interface DiffAnalysis {
  riskProfile: {
    overallRisk: string; touchedDomains: string[]; linesAdded: number; linesRemoved: number;
    isVibeRewrite: boolean; hasNewDependencies: boolean; hasMigrations: boolean; hasEnvChanges: boolean;
    hasSecuritySensitivePatterns: boolean; isDocOrConfigOnly: boolean; changedFilesSummary: string[];
    /** Routing v2 Layer 0: concrete vulnerability-class signatures found in the diff, if any. */
    deterministicSignatures?: SignatureClass[];
  };
  agentRecommendations: AgentRecommendation[];
  recommendedAgents: string[];
  mandatoryAgents: string[];
  parallelizationPlan: Array<{ phase: number; agents: string[]; reason: string }>;
}

/**
 * Pure diff-classification logic, extracted from analyse_commit_diff's tool body so it's
 * directly testable against real (or realistic) diff content without needing a live sandbox —
 * the sandbox is only used to fetch rawDiff/changedFiles in the first place, which this
 * function doesn't need to know about.
 */
export function classifyDiff(rawDiff: string, changedFiles: string[]): DiffAnalysis {
  // A unified diff writes added lines as "+code" with no space, so the previous /^\+ /gm only
  // counted lines whose content happened to begin with a space — i.e. indented code. Everything
  // at top level was invisible, which held linesAdded/linesRemoved far below the thresholds that
  // gate the architecture and bloat agents and made isVibeRewrite unreachable. The lookahead
  // keeps the file headers ("+++ b/file.ts", "--- a/file.ts") out of the counts.
  const linesAddedMatch = rawDiff.match(/^\+(?!\+)/gm);
  const linesRemovedMatch = rawDiff.match(/^-(?!-)/gm);
  const linesAdded = linesAddedMatch ? linesAddedMatch.length : 0;
  const linesRemoved = linesRemovedMatch ? linesRemovedMatch.length : 0;

  const DOMAIN_KEYWORDS = ['auth', 'payment', 'billing', 'admin', 'user', 'security'];
  const touchedDomains: string[] = DOMAIN_KEYWORDS.filter(domain =>
    changedFiles.some(f => f.toLowerCase().includes(domain))
  );
  // Routing v2 Layer 0 — deterministic signature floor (design doc §2). Runs before any model.
  const floor: FloorResult = scanDiff(rawDiff, changedFiles);
  // The keyword regex is the weak legacy signal; a concrete signature (exec/eval/traversal/AWS key)
  // is far stronger and must also raise this flag, which the keyword pass alone missed entirely.
  const hasSecuritySensitivePatterns = floor.hasSecuritySignature || /password|secret|token|auth|key/i.test(rawDiff);
  const hasMigrations = changedFiles.some(f => f.includes('migration') || f.includes('schema.ts'));
  const hasEnvChanges = changedFiles.some(f => f.includes('.env'));
  const hasNewDependencies = changedFiles.some(f => f.includes('package.json') || f.includes('pnpm-lock.yaml'));
  const isVibeRewrite = linesRemoved > 100 && linesAdded > 100 && linesAdded > linesRemoved * 2;

  const isDocOrConfigOnly = changedFiles.length > 0 && changedFiles.every(f =>
    /\.(md|txt)$/i.test(f) || /^(docs?\/|\.github\/)/i.test(f) || (/\.(ya?ml)$/i.test(f) && !f.includes('workflow'))
  );
  const isCodeFile = (f: string) => /\.(ts|tsx|js|jsx|py|go|rb|java)$/i.test(f);
  const anyCodeChanged = changedFiles.some(isCodeFile);

  // Routing is driven by what the CODE actually contains, not by guessing at file names. The old
  // heuristics dispatched data_dx only if a file was literally named "migration"/"analytics" and
  // compliance only if a file was named "consent"/"gdpr" — so a raw SQL string in users.service.ts
  // or a PII leak in profile.ts was never reviewed. These are content signals over the diff body,
  // and they compose with the deterministic floor's signatures (merged in below), which cover the
  // structural cases (S7 SQL, S9 secrets, S11 auth paths, S13 deps, S14 infra, S15 data-layer).
  const sig = floor.signatureClasses;
  // Content signals must read the ADDED CODE only, not the full unified diff — the diff's own
  // `diff --git a/src/consent.ts` header lines contain file paths, so matching against rawDiff
  // would silently re-introduce the filename guessing this refactor removes. addedBody is the
  // added lines with the leading '+' and the '+++' file headers stripped.
  const addedBody = (rawDiff.match(/^\+(?!\+).*/gm) ?? []).map((l) => l.slice(1)).join('\n');
  const touchedAiCallSites = /openai|anthropic|chat\.completions|generateText|generateObject|completion\(|\.invoke\(|langchain|llm/i.test(addedBody);
  const dataContentSignal =
    /\b(create|alter|drop)\s+table\b|\badd\s+column\b|\bprisma\b|\bdrizzle\b|\bsequelize\b|\btypeorm\b|\bknex\b|\.raw\(|information_schema|\bmigration\b/i.test(addedBody)
    || sig.includes('sql-injection') || sig.includes('data-layer-change') || hasMigrations;
  // Privacy/compliance CONTENT — PII handling, consent, retention, residency, accessibility — read
  // from the diff body. UI file extensions are kept as a structural (not name-guessing) signal
  // because accessibility obligations attach to rendered components.
  const complianceContentSignal =
    /\b(gdpr|ccpa|hipaa|consent|personal\s+data|\bpii\b|\bssn\b|social\s+security|passport|date\s+of\s+birth|\bdob\b|data\s+subject|right\s+to\s+(be\s+forgotten|erasure)|data\s+retention|retention\s+policy|cookie\s+consent|tracking|wcag|aria-|accessib)\b/i.test(addedBody)
    || changedFiles.some(f => /\.(tsx|jsx|vue|svelte)$/i.test(f))
    || sig.includes('hardcoded-secret') || sig.includes('auth-surface-change');
  const architectureContentSignal = linesAdded > 50 || sig.includes('infra-change');

  let overallRisk = 'LOW';
  if (floor.hasSecuritySignature || hasSecuritySensitivePatterns || hasMigrations || hasEnvChanges) overallRisk = 'HIGH';
  else if (linesAdded > 100) overallRisk = 'MEDIUM';

  const agentRecommendations: AgentRecommendation[] = [
    {
      agentType: 'security',
      recommend: !isDocOrConfigOnly,
      mandatory: !isDocOrConfigOnly,
      reason: isDocOrConfigOnly
        ? 'Documentation or non-workflow config only — zero code security exposure.'
        : 'Non-negotiable baseline on all code changes.'
    },
    {
      agentType: 'broken_code',
      recommend: anyCodeChanged,
      mandatory: false,
      reason: anyCodeChanged
        ? 'Code files changed — correctness/test-suite risk.'
        : 'No code files changed (docs/config only) — nothing for this agent to verify.'
    },
    {
      agentType: 'architecture',
      recommend: !isDocOrConfigOnly && architectureContentSignal,
      mandatory: false,
      reason: sig.includes('infra-change')
        ? 'Infrastructure/IaC change detected in the diff — structural risk.'
        : linesAdded > 50 && !isDocOrConfigOnly
        ? `${linesAdded} lines added — large enough to risk structural/coupling issues.`
        : 'Small, docs-only, or no structural signal — low architectural risk.'
    },
    {
      agentType: 'bloat',
      recommend: !isDocOrConfigOnly && (linesAdded > 20 || linesRemoved > 20),
      mandatory: false,
      reason: !isDocOrConfigOnly && (linesAdded > 20 || linesRemoved > 20)
        ? `${linesAdded} added / ${linesRemoved} removed — enough churn to check for dead code/duplication.`
        : 'Diff too small or docs-only — skipping bloat analysis.'
    },
    {
      agentType: 'data_dx',
      recommend: !isDocOrConfigOnly && dataContentSignal,
      mandatory: false,
      reason: dataContentSignal
        ? 'Diff contains data-layer operations (SQL/DDL, ORM, or a migration) — content-detected, not filename-guessed.'
        : 'No data-layer operations found in the diff body.'
    },
    {
      agentType: 'compliance',
      recommend: !isDocOrConfigOnly && complianceContentSignal,
      mandatory: false,
      reason: complianceContentSignal
        ? 'Diff contains privacy/PII/consent/accessibility content or a rendered UI component — content-detected.'
        : 'No privacy/PII/compliance content found in the diff.'
    },
    {
      agentType: 'ai_era',
      recommend: !isDocOrConfigOnly && touchedAiCallSites,
      mandatory: false,
      reason: touchedAiCallSites
        ? 'Diff contains an LLM call-site pattern (openai/anthropic/completions/generateText).'
        : 'No LLM call-site changes detected in the diff.'
    },
  ];
  // Routing v2 Layer 0: a deterministic signature is a stronger signal than any keyword or
  // filename heuristic, so it upgrades the matched specialist agent to recommended AND mandatory
  // — the code-enforced floor that the LLM router cannot remove. A signature can only add agents,
  // never subtract, preserving the design-doc invariant.
  for (const forced of floor.forcedAgents) {
    const rec = agentRecommendations.find(a => a.agentType === forced);
    const why = floor.matches.filter(m => m.forces.includes(forced)).map(m => `${m.id}:${m.signatureClass}`).join(', ');
    if (rec) {
      rec.recommend = true;
      rec.mandatory = true;
      rec.reason = `Deterministic floor matched [${why}] — force-dispatched, LLM cannot remove.`;
    } else {
      agentRecommendations.push({ agentType: forced, recommend: true, mandatory: true,
        reason: `Deterministic floor matched [${why}] — force-dispatched, LLM cannot remove.` });
    }
  }

  const recommendedAgents = agentRecommendations.filter(a => a.recommend).map(a => a.agentType);
  const mandatoryAgents = agentRecommendations.filter(a => a.mandatory).map(a => a.agentType);

  return {
    riskProfile: {
      overallRisk, touchedDomains, linesAdded, linesRemoved, isVibeRewrite, hasNewDependencies,
      hasMigrations, hasEnvChanges, hasSecuritySensitivePatterns, isDocOrConfigOnly,
      changedFilesSummary: changedFiles.slice(0, 5),
      deterministicSignatures: floor.signatureClasses,
    },
    agentRecommendations,
    recommendedAgents,
    mandatoryAgents,
    parallelizationPlan: [
      { phase: 1, agents: recommendedAgents, reason: 'Dynamic parallel execution based on real diff signals — see agentRecommendations for the per-agent reasoning.' }
    ],
  };
}

/**
 * Safely extracts diff content and list of changed files from the sandbox.
 * For PRs with multiple commits, it resolves the base branch (origin/main, origin/master, origin/HEAD)
 * and runs `git diff base...HEAD` so all commits in the PR are captured.
 * Falls back to `git show HEAD` if base branch comparison is unavailable.
 */
export async function getGitDiffAndFiles(sandbox: SandboxHandle): Promise<{ rawDiff: string; changedFiles: string[] }> {
  const baseCandidates = ['origin/main', 'origin/master', 'origin/HEAD', 'HEAD~1'];

  for (const base of baseCandidates) {
    try {
      const check = await sandbox.exec(`git rev-parse --verify ${base}`);
      if (check.exitCode === 0) {
        const diffRes = await sandbox.exec(`git diff ${base}...HEAD`);
        if (diffRes.exitCode === 0 && diffRes.stdout && diffRes.stdout.trim().length > 0) {
          const filesRes = await sandbox.exec(`git diff --name-only ${base}...HEAD`);
          const changedFiles = (filesRes.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);
          return { rawDiff: diffRes.stdout, changedFiles };
        }
      }
    } catch {
      // Try next candidate
    }
  }

  const diffRes = await sandbox.exec('git show --format= HEAD');
  const filesRes = await sandbox.exec('git show --format= --name-only HEAD');
  const rawDiff = diffRes.stdout || '';
  const changedFiles = (filesRes.stdout || '').split('\n').map(s => s.trim()).filter(Boolean);
  return { rawDiff, changedFiles };
}

export const createOrchestratorTools = (sandbox: SandboxHandle) => ({
  read_repo_config: {
    description: 'Load the repo\'s .codeward.json config file.',
    parameters: z.object({
      repoPath: z.string(),
      repoId: z.string()
    }),
    execute: async (args: any) => {
      // 1. Try to read .codeward.json directly from the cloned repo
      const res = await sandbox.exec('cat .codeward.json');
      let config = {
        tier: "free",
        strictMode: false,
        highStakesDomains: ["payments", "auth"],
        excludedPaths: [],
        customThresholds: {
          securityMinScore: 80,
          bloatMaxFindings: 20,
          architectureMinScore: 70
        },
        agentOverrides: {},
        notifyChannels: []
      };

      if (res.exitCode === 0 && res.stdout) {
        try {
          const parsed = JSON.parse(res.stdout);
          config = { ...config, ...parsed };
          console.log(`[Orchestrator] Parsed .codeward.json for repo.`);
        } catch (e) {
          console.warn(`[Orchestrator] Invalid JSON in .codeward.json, using defaults.`);
        }
      } else {
        console.log(`[Orchestrator] No .codeward.json found, using defaults.`);
      }

      return { config };
    }
  },

  analyse_commit_diff: {
    description: 'Parse the git diff and produce a structured risk assessment of what changed. Pass the runId from your task prompt so the result is handed to Phase 2 and Phase 3 instead of being recomputed.',
    parameters: z.object({
      diff: z.string().optional(),
      changedFiles: z.array(z.string()).optional(),
      repoConfig: z.object({}).passthrough().optional(),
      runId: z.string().optional().describe('The EXACT runId from your task prompt. Supplying it persists this analysis onto the run so later phases inherit it.')
    }),
    execute: async (args: any) => {
      const { rawDiff, changedFiles } = await getGitDiffAndFiles(sandbox);
      const analysis = classifyDiff(rawDiff, changedFiles);

      // Phase 1's whole job is ingestion, but its output was returned to the model and then
      // dropped on the floor — Phase 2 received an identical task prompt with none of it, so it
      // paid to derive the same classification again. Persisting it here is what turns Phase 1
      // from a cost centre into the ingestion step it was designed to be.
      const runId = Number(args?.runId);
      if (Number.isFinite(runId) && runId > 0) {
        try {
          const { db } = await import('../../../db/index.js');
          const { runs } = await import('../../../db/schema.js');
          const { eq } = await import('drizzle-orm');
          const [existing] = await db.select({ scope: runs.scope }).from(runs).where(eq(runs.id, runId));
          await db.update(runs).set({
            scope: { ...((existing?.scope as any) ?? {}), ingestion: analysis },
          }).where(eq(runs.id, runId));
        } catch (err: any) {
          console.warn(`[Orchestrator] Could not persist ingestion analysis for run ${args.runId}:`, err.message);
        }
      }

      return analysis;
    }
  },

  spawn_agent: {
    description: 'Dispatch a sub-agent by writing a job to the BullMQ queue.',
    parameters: z.object({
      agentType: z.enum(["security", "bloat", "broken_code", "architecture", "ai_era", "compliance", "data_dx"]),
      runId: z.string().describe('The EXACT runId given to you in your task prompt. Never invent, guess, or reuse an example value — a real concurrent stress test caught the model fabricating runId:1001 and even the literal string "run-1" here, which crashed the DB insert.'),
      repoId: z.string(),
      repoFullName: z.string().describe('The EXACT "owner/repo" string given to you in your task prompt (e.g. "kelvinmaina01/codeward-"), reused verbatim. A real stress test caught the model silently dropping the owner prefix on some calls (passing just "codeward-"), which made the sub-agent\'s git clone fail with a 404 — never shorten, reformat, or reconstruct this value.'),
      commitSha: z.string(),
      priority: z.enum(["critical", "high", "normal", "low"]),
      payload: z.record(z.unknown())
    }),
    execute: async (args: any) => {
      // Dynamic import to avoid top-level circular dependencies
      const { agentQueue } = await import('../../queue/agent.queue.js');
      const { db } = await import('../../../db/index.js');
      const { agentTasks } = await import('../../../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      // Idempotency check: a real stress test showed Phase 2's own tool-calling loop call
      // spawn_agent twice for the same agentType within one run (two separate BullMQ job IDs
      // for "broken_code" in the same Phase 2 execution) — real wasted cost, a second real Fly
      // Machine boot and a second full LLM run for a duplicate analysis the model apparently
      // forgot it had already dispatched. If a task row already exists for this
      // (runId, agentType), skip the duplicate entirely instead of enqueueing another job.
      const [existing] = await db.select().from(agentTasks).where(
        and(eq(agentTasks.runId, Number(args.runId)), eq(agentTasks.agentId, args.agentType))
      );
      if (existing) {
        console.log(`[Orchestrator] Skipped duplicate spawn_agent(${args.agentType}) for run ${args.runId} — already dispatched (status: ${existing.status}).`);
        return { jobId: `existing-${existing.id}`, agentType: args.agentType, status: existing.status, note: 'Already dispatched for this run — not spawned again.' };
      }

      // Insert the tracking row BEFORE enqueuing, not after the worker picks the job up.
      // The 'completed' handler decides "are all sub-agents for this run done?" by counting
      // non-terminal agentTasks rows — if the row only appeared once a worker slot freed up,
      // a fast-finishing agent could see zero rows for a still-queued sibling and trigger
      // Phase 3 early. Status 'queued' here; the worker flips it to 'running' when it starts.
      await db.insert(agentTasks).values({
        runId: Number(args.runId),
        agentId: args.agentType,
        status: 'queued',
        provider: 'openai',
      });

      const job = await agentQueue.add(`agent-${args.agentType}`, {
        agentId: args.agentType,
        commitSHA: args.commitSha,
        repoFullName: args.repoFullName,
        runId: Number(args.runId)
      });
      console.log(`[Orchestrator] Spawned agent ${args.agentType} with job ID ${job.id}`);
      return {
        jobId: job.id,
        agentType: args.agentType,
        status: "queued"
      };
    }
  },

  dispatch_recommended_agents: {
    description: 'The REAL, code-enforced dispatch step — call this ONCE per run instead of hand-calling spawn_agent for each agent. It re-derives the diff classification itself (the same real logic behind analyse_commit_diff, not whatever you remember from reading its output) and spawns exactly the recommended set, so the decision is grounded in the actual diff every time rather than left to be reconstructed correctly across several separate tool calls. Pass overrides ONLY when you have a specific, diff-grounded reason to deviate from the recommendation (e.g. search_memory showed this exact path\'s history warrants more or less scrutiny) — "just in case" is not a valid reason and both add/remove entries require reason text. Mandatory agents (currently: security on code changes) can never be removed, even via override — that request is silently ignored.',
    parameters: z.object({
      runId: z.string(),
      repoId: z.string(),
      repoFullName: z.string(),
      commitSha: z.string(),
      overrides: z.object({
        add: z.array(z.object({ agentType: z.string(), reason: z.string() })).optional().default([]),
        remove: z.array(z.object({ agentType: z.string(), reason: z.string() })).optional().default([]),
      }).optional().default({ add: [], remove: [] }),
    }),
    execute: async (args: any) => {
      const { agentQueue } = await import('../../queue/agent.queue.js');
      const { db } = await import('../../../db/index.js');
      const { agentTasks, runs } = await import('../../../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      const { rawDiff, changedFiles } = await getGitDiffAndFiles(sandbox);
      const analysis = classifyDiff(rawDiff, changedFiles);

      const addSet = new Set(args.overrides?.add?.map((o: any) => o.agentType) ?? []);
      const removeSet = new Set((args.overrides?.remove ?? []).filter((o: any) => !analysis.mandatoryAgents.includes(o.agentType)).map((o: any) => o.agentType));
      const ignoredRemovals = (args.overrides?.remove ?? []).filter((o: any) => analysis.mandatoryAgents.includes(o.agentType));

      const finalSet = new Set(analysis.recommendedAgents);
      for (const a of addSet) finalSet.add(a as string);
      for (const a of removeSet) finalSet.delete(a as string);
      for (const a of analysis.mandatoryAgents) finalSet.add(a); // real backstop, redundant with agent.queue.ts's own but cheap to double-guarantee here

      // Model-tier escalation. The security agent already defaults to the synthesis tier
      // (security.agent.ts) because a scanner on the mechanical tier misses blatant vulns — run
      // #140 had Haiku 4.5 report 0 findings on two RCEs, hardcoded AWS keys and a path traversal.
      // This re-forces security onto synthesis at dispatch whenever Layer 0's deterministic floor
      // flagged a signature or rated the diff HIGH, so a reverted default (or an operator override)
      // cannot silently downgrade the one agent that must not run blind. The worker reads this
      // `model` from the job payload (agent.queue.ts).
      const floorFlagged =
        (analysis.riskProfile.deterministicSignatures?.length ?? 0) > 0 ||
        analysis.riskProfile.overallRisk === 'HIGH';
      // Fleet-wide intelligence upgrade: on a high-risk / floor-flagged diff, NO finding-producing
      // agent runs blind on the mechanical tier — every one that was dispatched is escalated to the
      // synthesis tier for this run. Security is escalated whenever it is present (its default is
      // already synthesis; this is the belt-and-suspenders guarantee). On a low-risk diff the fleet
      // stays on the cheaper mechanical tier — the escalation is proportional to real risk, not blanket.
      const FINDING_AGENTS = ['security', 'broken_code', 'architecture', 'bloat', 'data_dx', 'compliance', 'ai_era'];
      const escalateToSynthesis = new Set<string>();
      escalateToSynthesis.add('security');
      if (floorFlagged) for (const a of FINDING_AGENTS) escalateToSynthesis.add(a);

      const dispatched: string[] = [];
      const escalated: string[] = [];
      const skipped: Array<{ agentType: string; reason: string }> = [];
      for (const agentType of finalSet) {
        const [existing] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, Number(args.runId)), eq(agentTasks.agentId, agentType)));
        if (existing) { skipped.push({ agentType, reason: `Already dispatched (status: ${existing.status}).` }); continue; }
        const modelOverride = escalateToSynthesis.has(agentType) ? MODEL_TIER.synthesis : undefined;
        await db.insert(agentTasks).values({ runId: Number(args.runId), agentId: agentType, status: 'queued', provider: 'openai' });
        await agentQueue.add(`agent-${agentType}`, {
          agentId: agentType, commitSHA: args.commitSha, repoFullName: args.repoFullName, runId: Number(args.runId),
          ...(modelOverride ? { model: modelOverride } : {}),
        });
        dispatched.push(agentType);
        if (modelOverride) escalated.push(agentType);
      }
      if (escalated.length > 0) {
        console.log(`[Orchestrator] Layer-0 floor flagged high-risk signatures — escalated to synthesis tier: [${escalated.join(', ')}]`);
      }

      // Persist the diff analysis and risk profile onto runs.scope so downstream queue handlers
      // and workers know if this run is doc-only or which agents were recommended.
      try {
        await db.update(runs).set({
          scope: {
            isDocOrConfigOnly: analysis.riskProfile.isDocOrConfigOnly,
            overallRisk: analysis.riskProfile.overallRisk,
            recommendedAgents: analysis.recommendedAgents,
            dispatchedAgents: dispatched,
            changedFilesSummary: analysis.riskProfile.changedFilesSummary,
          }
        }).where(eq(runs.id, Number(args.runId)));
      } catch (err: any) {
        console.warn(`[Orchestrator] Could not update runs.scope for run ${args.runId}:`, err.message);
      }

      console.log(`[Orchestrator] dispatch_recommended_agents for run ${args.runId}: recommended=[${analysis.recommendedAgents.join(',')}], dispatched=[${dispatched.join(',')}]${addSet.size ? `, added=[${[...addSet].join(',')}]` : ''}${removeSet.size ? `, removed=[${[...removeSet].join(',')}]` : ''}`);

      return {
        recommendedAgents: analysis.recommendedAgents,
        dispatchedAgents: dispatched,
        skipped,
        ignoredRemovals: ignoredRemovals.map((o: any) => ({ agentType: o.agentType, reason: 'Mandatory agent — cannot be removed regardless of stated reason.' })),
        riskProfile: analysis.riskProfile,
      };
    }
  },

  await_agent_results: {
    description: 'Real Postgres polling for sub-agent results. Waits until all dispatched agents for this run reach a terminal state or timeout. Not required for the pipeline to progress — Phase 3 is triggered automatically by the queue worker when the last sub-agent finishes — but callable if the LLM wants to check status directly.',
    parameters: z.object({
      runId: z.string(),
      timeoutSeconds: z.number().optional().default(20).describe('Clamped to 60s maximum. This call occupies a worker slot and a live sandbox while it waits.'),
      pollIntervalMs: z.number().optional().default(2000)
    }),
    execute: async (args: { runId: string; timeoutSeconds?: number; pollIntervalMs?: number }) => {
      const { db } = await import('../../../db/index.js');
      const { agentTasks } = await import('../../../db/schema.js');
      const { eq, and, notLike } = await import('drizzle-orm');

      // A-4: this blocks a BullMQ worker slot and holds a live sandbox for its whole duration.
      // At the old 300s default, with concurrency 10, a handful of Phase 2s electing to poll
      // could starve the pool of the very sub-agents they were waiting for. Phase 3 is triggered
      // automatically when the last sub-agent finishes, so this is a status check, not the
      // mechanism — clamped accordingly.
      const requested = args.timeoutSeconds ?? 20;
      const timeoutSeconds = Math.max(1, Math.min(60, requested));
      const deadline = Date.now() + timeoutSeconds * 1000;
      while (Date.now() < deadline) {
        const tasks = await db.select().from(agentTasks).where(
          and(eq(agentTasks.runId, Number(args.runId)), notLike(agentTasks.agentId, 'orchestrator%'))
        );
        const pending = tasks.filter((t: any) => t.status === 'queued' || t.status === 'running');
        if (pending.length === 0) {
          return {
            completedAgents: tasks.filter((t: any) => t.status === 'completed').map((t: any) => ({ agentType: t.agentId, status: t.status, score: t.score, durationMs: t.duration })),
            failedAgents: tasks.filter((t: any) => t.status === 'failed').map((t: any) => ({ agentType: t.agentId, error: t.error })),
            timedOutAgents: []
          };
        }
        await new Promise(r => setTimeout(r, args.pollIntervalMs ?? 2000));
      }
      const tasks = await db.select().from(agentTasks).where(
        and(eq(agentTasks.runId, Number(args.runId)), notLike(agentTasks.agentId, 'orchestrator%'))
      );
      return {
        completedAgents: tasks.filter((t: any) => t.status === 'completed').map((t: any) => ({ agentType: t.agentId, status: t.status, score: t.score })),
        failedAgents: tasks.filter((t: any) => t.status === 'failed').map((t: any) => ({ agentType: t.agentId, error: t.error })),
        timedOutAgents: tasks.filter((t: any) => t.status === 'queued' || t.status === 'running').map((t: any) => t.agentId)
      };
    }
  },

  aggregate_results: {
    description: 'Combine all sub-agent results into a single weighted debt score.',
    parameters: z.object({
      runId: z.string(),
      agentResults: z.array(z.object({}).passthrough()).optional()
    }),
    execute: async (args: any) => {
      const { db } = await import('../../../db/index.js');
      const { agentTasks } = await import('../../../db/schema.js');
      const { eq } = await import('drizzle-orm');

      const tasks = await db.select().from(agentTasks).where(eq(agentTasks.runId, Number(args.runId)));
      
      let totalScore = 0;
      let count = 0;
      const criticalFindings: any[] = [];
      const agentScoreSummary: any[] = [];
      // The orchestrator's Hard Rules branch on a red test suite and a failed migration
      // rollback. broken_code has always DECLARED both in its submit schema — they were simply
      // never carried out of its report, so the rule could not fire. Transport them here, with
      // null meaning "the check did not run" so the orchestrator can tell that apart from a pass.
      let testSuiteResult: any = null;
      let migrationRollbackPassed: boolean | null = null;

      for (const task of tasks) {
        if (task.agentId.startsWith('orchestrator')) continue;

        if (task.agentId === 'broken_code') {
          const meta = (task.reportMeta as any) ?? {};
          const report = meta.report ?? meta.reportArgs ?? meta;
          if (report?.testSuiteResult && typeof report.testSuiteResult === 'object') {
            testSuiteResult = report.testSuiteResult;
          }
          if (typeof report?.migrationRollbackPassed === 'boolean') {
            migrationRollbackPassed = report.migrationRollbackPassed;
          }
        }
        
        if (task.score !== null && task.score !== undefined) {
          totalScore += task.score;
          count++;
          
          agentScoreSummary.push({
            agentType: task.agentId,
            score: task.score,
            status: task.status,
            findingsCount: task.findingsCount
          });
        }
        
        if (task.findings && Array.isArray(task.findings)) {
          // Only findings that clear the backend policy count as blockers. The previous
          // filter matched on the model's severity string alone, so a CRITICAL asserted
          // with no file, no tool output and hedged wording carried exactly as much weight
          // as one confirmed by a scanner.
          // The task's own chain-of-custody log is applied here too, so this summary agrees
          // with the authoritative gate in agent.queue.ts instead of drifting from it.
          const executed = ((task.reportMeta as any)?.toolsExecuted ?? []) as Array<{ toolName?: string }>;
          const executedTools = Array.isArray(executed)
            ? executed.map((e: any) => String(e?.toolName ?? '')).filter(Boolean)
            : [];
          const policyOpts = executedTools.length > 0 ? { executedTools } : {};
          const criticals = task.findings.filter((f: any) => {
            const a = assessFinding(f, policyOpts);
            return a.blocking;
          });
          criticalFindings.push(...criticals.map(c => ({ ...c, agentType: task.agentId })));
        }
      }

      // Reported for the dashboard's trend line only. It is deliberately NOT the gate:
      // averaging lets a pile of mediums drag a run under a threshold while diluting the one
      // agent that found something real. The gate is decided by decideGate() over validated
      // findings in agent.queue.ts, which is max-based rather than additive.
      //
      // A-3: when NO agent reported a score this used to return 100 — a run in which every
      // agent crashed or truncated presented as a perfect score. Absence of measurement is not
      // evidence of health, so it now reports null and says why.
      const weightedScore = count > 0 ? Math.round(totalScore / count) : null;

      return {
        weightedScore,
        scoreIsAdvisoryOnly: true,
        scoredAgentCount: count,
        scoreUnavailableReason: count === 0
          ? 'No sub-agent produced a score (all failed, truncated, or were never dispatched). This is NOT a 100 — report the run as unverified.'
          : null,
        criticalFindings,
        allBlockReasons: criticalFindings.map(c => `[${c.agentType}] ${c.title}`),
        agentScoreSummary,
        // null on either of these means the check never ran — "not verified", not "passed".
        testSuiteResult,
        migrationRollbackPassed,
        conflictingSignals: []
      };
    }
  },

  post_github_check_run: {
    description: 'Report the intended GitHub Check Run state. NOTE: the backend posts and completes the real Check Run deterministically from the policy gate (github-pr-lifecycle.service) — it does not depend on this call, so the check is never missed if you skip it. Calling this records your intent for the audit trail; it does not itself post to GitHub.',
    parameters: z.object({
      repoId: z.string(),
      commitSha: z.string(),
      status: z.enum(["in_progress", "completed"]),
      conclusion: z.enum(["success", "failure", "neutral", "cancelled"]).optional(),
      title: z.string(),
      summary: z.string(),
      annotations: z.array(z.object({
        path: z.string(),
        startLine: z.number(),
        endLine: z.number(),
        annotationLevel: z.enum(["notice", "warning", "failure"]),
        message: z.string(),
        title: z.string()
      }))
    }),
    execute: async (args: any) => {
      // Previously returned a fabricated checkRunId and htmlUrl, which taught the model it had
      // published something it had not — and it then reported that success in notificationsSent.
      // The real Check Run is completed by the queue after the policy gate resolves.
      console.log(`[Orchestrator] Check-run intent recorded: ${args.status}${args.conclusion ? `/${args.conclusion}` : ''} — real posting is handled by the backend lifecycle service.`);
      return {
        recorded: true,
        postedToGitHub: false,
        handledBy: 'backend:github-pr-lifecycle.service',
        note: 'Intent recorded for the audit trail. The backend posts the real Check Run from the policy gate — do not report this as a notification you delivered.',
      };
    }
  },

  post_pr_comment: {
    description: 'Post the full Codeward debt report as a PR comment.',
    parameters: z.object({
      repoId: z.string(),
      pullRequestNumber: z.number(),
      body: z.string(),
      updateExisting: z.boolean()
    }),
    execute: async (args: any) => {
      const { db } = await import('../../../db/index.js');
      const { repositories } = await import('../../../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const { getInstallationOctokit } = await import('../../../lib/github.js');

      // Fetch repo to get owner, name, and installationId
      const repo = await db.query.repositories.findFirst({
        where: eq(repositories.id, Number(args.repoId))
      });
      
      if (!repo || !repo.installationId) {
         console.warn(`[Orchestrator] Missing installation ID for repo ${args.repoId}. Skipping PR comment.`);
         return { error: "No installationId found" };
      }

      try {
        const octokit = await getInstallationOctokit(repo.installationId);
        
        const response = await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: repo.owner,
          repo: repo.name,
          issue_number: args.pullRequestNumber,
          body: args.body,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        
        return { commentId: response.data.id, htmlUrl: response.data.html_url };
      } catch (e: any) {
        console.error(`[Orchestrator] Failed to post PR comment: ${e.message}`);
        return { error: e.message };
      }
    }
  },

  trigger_rollback: {
    description: 'Trigger an automated rollback via the GitHub Revert API.',
    parameters: z.object({
      repoId: z.string(),
      commitSha: z.string(),
      reason: z.string(),
      notifyChannels: z.array(z.string())
    }),
    execute: async (args: any) => {
      // Constitution Rule 4 instructs a rollback on a critical landing on main, and this returned
      // a fabricated PR number — so the model reported a rollback that never happened, on exactly
      // the runs where one mattered most. Automated reverts are not implemented; failing honestly
      // and loudly is the only safe behaviour until they are.
      console.error(
        `[Orchestrator] ROLLBACK REQUESTED BUT NOT PERFORMED — run on ${args.commitSha}: ${args.reason}. ` +
        `Automated revert is not implemented; a human must act on this.`
      );
      return {
        rollbackTriggered: false,
        implemented: false,
        rollbackPrUrl: null,
        reason: 'Automated rollback is not implemented in this pipeline. Report rollbackTriggered: false and state in your rationale that a human must revert this manually.',
      };
    }
  },

  post_slack_notification: {
    description: 'Send a formatted notification to the team\'s Slack channel.',
    parameters: z.object({
      channel: z.string(),
      message: z.object({}).passthrough(),
      mentionUsers: z.array(z.string()).optional(),
      priority: z.enum(["critical", "normal", "info"])
    }),
    execute: async (args: any) => {
      // No Slack transport exists in this codebase (NotificationService is email-only). Returning
      // a fabricated message timestamp made the model report a delivered notification every run.
      console.warn(`[Orchestrator] Slack notification requested for channel "${args.channel}" but no Slack transport is configured — not sent.`);
      return {
        sent: false,
        implemented: false,
        reason: 'No Slack transport is configured for this deployment. Do not list this in notificationsSent as successful.',
      };
    }
  },

  send_email_notification: {
    description: 'Send the detailed report via email.',
    parameters: z.object({
      to: z.array(z.string()),
      subject: z.string(),
      htmlBody: z.string(),
      attachments: z.array(z.object({ filename: z.string(), content: z.string() })).optional()
    }),
    execute: async (args: any) => {
      // The run-completed report email is enqueued deterministically by submit_orchestrator_decision
      // (emailQueue, idempotent per run), so this tool firing a second ad-hoc email would double-send.
      // It previously returned a fabricated messageId, which the model then reported as delivered.
      console.log(`[Orchestrator] Ad-hoc email requested for ${(args.to ?? []).length} recipient(s) — suppressed; the run-completed report is enqueued automatically.`);
      return {
        sent: false,
        implemented: false,
        reason: 'The run-completed report email is enqueued automatically when you submit your decision. Do not list an ad-hoc email in notificationsSent.',
      };
    }
  },

  query_run_history: {
    description: 'Load the last N completed runs for this repo from Postgres, with the real score trend. Use this to populate scoreVsPriorRun and historicalTrend instead of estimating them.',
    parameters: z.object({
      repoId: z.string(),
      limit: z.number().default(10),
      agentType: z.string().optional()
    }),
    execute: async (args: any) => {
      // This returned a hardcoded empty history with averageScore 90 and trend "stable", which is
      // precisely the data Phase 3's schema needs for scoreVsPriorRun and historicalTrend — so the
      // one tool meant to ground those fields was itself inventing them. The runs table has held
      // the real answer all along.
      const { db } = await import('../../../db/index.js');
      const { runs } = await import('../../../db/schema.js');
      const { eq, and, desc, isNotNull } = await import('drizzle-orm');

      const repoId = Number(args.repoId);
      if (!Number.isFinite(repoId)) {
        return { applicable: false, reason: 'A numeric repoId is required.', runs: [], scoreTrend: null, averageScore: null };
      }

      const limit = Math.max(1, Math.min(50, Number(args.limit) || 10));
      const rows = await db.select({ id: runs.id, score: runs.score, status: runs.status, commitSha: runs.commitSha, createdAt: runs.createdAt })
        .from(runs)
        .where(and(eq(runs.repoId, repoId), eq(runs.status, 'completed'), isNotNull(runs.score)))
        .orderBy(desc(runs.createdAt))
        .limit(limit);

      if (rows.length === 0) {
        return {
          runs: [], scoreTrend: null, averageScore: null, priorScore: null,
          note: 'No prior completed, scored run for this repository. scoreVsPriorRun is 0 and historicalTrend is "stable" — say so rather than implying a history that does not exist.',
        };
      }

      const scores = rows.map((r) => r.score as number);
      const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      // Newest-first, so comparing the head against the tail gives the direction over the window.
      const delta = scores.length > 1 ? scores[0] - scores[scores.length - 1] : 0;
      const scoreTrend = delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'stable';

      return {
        runs: rows.map((r) => ({ runId: r.id, score: r.score, commitSha: r.commitSha, completedAt: r.createdAt })),
        priorScore: scores[0],
        averageScore,
        scoreTrend,
        windowSize: rows.length,
      };
    }
  },

  store_orchestrator_result: {
    description: 'Persist the final OrchestratorResult to Postgres.',
    parameters: z.object({
      runId: z.string(),
      result: z.object({}).passthrough()
    }),
    execute: async (args: any) => {
      const { db } = await import('../../../db/index.js');
      const { runs } = await import('../../../db/schema.js');
      const { eq } = await import('drizzle-orm');
      
      const overallScore = args.result.overallWeightedScore || 0;
      await db.update(runs).set({
        status: 'completed',
        score: overallScore,
      }).where(eq(runs.id, Number(args.runId)));
      
      return { stored: true, runId: args.runId };
    }
  },

  ...createMemoryTools('orchestrator'),

  submit_orchestrator_decision: {
    description: 'Submit the final Orchestrator Result JSON. Calling this tool ends the run.',
    parameters: z.object({
      agentType: z.literal("orchestrator"),
      runId: z.string(),
      repoId: z.string(),
      commitSha: z.string(),
      branch: z.string(),
      authorEmail: z.string(),
      executedAt: z.string().datetime(),
      completedAt: z.string().datetime(),
      totalDurationMs: z.number(),

      gateDecision: z.enum(["PASS", "BLOCK", "WARN"]),
      rationale: z.string(),
      blockReasons: z.array(z.string()),
      
      overallWeightedScore: z.number().min(0).max(100),
      scoreVsPriorRun: z.number(),
      historicalTrend: z.enum(["improving", "stable", "declining"]),
      
      commitRiskProfile: z.object({
        overallRisk: z.string(),
        touchedDomains: z.array(z.string()),
        isVibeRewrite: z.boolean(),
        hasNewDependencies: z.boolean(),
        hasMigrations: z.boolean()
      }),
      
      conflictResolutions: z.array(z.object({
        conflict: z.string(),
        resolution: z.string(),
        reasoning: z.string()
      })),
      
      agentsDispatched: z.array(z.string()),
      agentsSkipped: z.array(z.object({
        agentType: z.string(),
        reason: z.string()
      })),
      
      notificationsSent: z.array(z.object({
        channel: z.enum(["github_check", "github_pr_comment", "slack", "email"]),
        sentAt: z.string().datetime(),
        success: z.boolean()
      })),
      
      rollbackTriggered: z.boolean(),
      rollbackPrUrl: z.string().nullable()
    }),
    execute: async (args: any) => {
      console.log(`[Orchestrator] Final Decision for Run ${args.runId}: ${args.gateDecision}`);
      console.log(`[Orchestrator] Rationale: ${args.rationale}`);

      // Enqueue the flagship Run Completed report email with idempotency guard
      try {
        const { emailQueue } = await import('../../../queue/email.queue.js');
        await emailQueue.add(
          'run-completed',
          { type: 'run-completed', runId: Number(args.runId) },
          // BullMQ rejects ':' in a custom job id ("Custom Id cannot contain :") because it is
          // the delimiter in its own Redis key scheme, so this threw on every completed run and
          // the run-completed email was never actually enqueued.
          { jobId: `run-completed-${args.runId}` }
        );
      } catch (queueErr) {
        console.warn(`[Orchestrator] Failed to enqueue run-completed email:`, queueErr);
      }

      return { success: true, message: "Decision submitted successfully.", gateDecision: args.gateDecision };
    }
  }
});
