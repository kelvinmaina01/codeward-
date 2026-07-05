import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createMemoryTools } from '../../tools/memory.tools.js';

export interface AgentRecommendation { agentType: string; recommend: boolean; mandatory: boolean; reason: string }

export interface DiffAnalysis {
  riskProfile: {
    overallRisk: string; touchedDomains: string[]; linesAdded: number; linesRemoved: number;
    isVibeRewrite: boolean; hasNewDependencies: boolean; hasMigrations: boolean; hasEnvChanges: boolean;
    hasSecuritySensitivePatterns: boolean; isDocOrConfigOnly: boolean; changedFilesSummary: string[];
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
  const linesAddedMatch = rawDiff.match(/^\+ /gm);
  const linesRemovedMatch = rawDiff.match(/^\- /gm);
  const linesAdded = linesAddedMatch ? linesAddedMatch.length : 0;
  const linesRemoved = linesRemovedMatch ? linesRemovedMatch.length : 0;

  const DOMAIN_KEYWORDS = ['auth', 'payment', 'billing', 'admin', 'user', 'security'];
  const touchedDomains: string[] = DOMAIN_KEYWORDS.filter(domain =>
    changedFiles.some(f => f.toLowerCase().includes(domain))
  );
  const hasSecuritySensitivePatterns = /password|secret|token|auth|key/i.test(rawDiff);
  const hasMigrations = changedFiles.some(f => f.includes('migration') || f.includes('schema.ts'));
  const hasEnvChanges = changedFiles.some(f => f.includes('.env'));
  const hasNewDependencies = changedFiles.some(f => f.includes('package.json') || f.includes('pnpm-lock.yaml'));
  const isVibeRewrite = linesRemoved > 100 && linesAdded > 100 && linesAdded > linesRemoved * 2;

  const isDocOrConfigOnly = changedFiles.length > 0 && changedFiles.every(f =>
    /\.(md|txt)$/i.test(f) || /^(docs?\/|\.github\/)/i.test(f) || (/\.(ya?ml)$/i.test(f) && !f.includes('workflow'))
  );
  const isCodeFile = (f: string) => /\.(ts|tsx|js|jsx|py|go|rb|java)$/i.test(f);
  const touchedDataFiles = changedFiles.some(f => /migration|schema\.ts|pipeline|etl|analytics|tracking/i.test(f));
  const touchedUiFiles = changedFiles.some(f => isCodeFile(f) && /\.(tsx|jsx)$/i.test(f));
  const touchedAiCallSites = /openai|anthropic|chat\.completions|generateText|completion\(/i.test(rawDiff);
  const touchedComplianceRelevant = changedFiles.some(f => /consent|gdpr|retention|pii|accessib/i.test(f)) || touchedUiFiles;
  const touchedCiOrTooling = changedFiles.some(f => /\.github\/workflows|docker-compose|Dockerfile|\.nvmrc|package\.json/i.test(f));
  const anyCodeChanged = changedFiles.some(isCodeFile);

  let overallRisk = 'LOW';
  if (hasSecuritySensitivePatterns || hasMigrations || hasEnvChanges) overallRisk = 'HIGH';
  else if (linesAdded > 100) overallRisk = 'MEDIUM';

  const agentRecommendations: AgentRecommendation[] = [
    { agentType: 'security', recommend: true, mandatory: true, reason: 'Non-negotiable baseline on every commit regardless of diff content.' },
    { agentType: 'broken_code', recommend: anyCodeChanged, mandatory: false, reason: anyCodeChanged ? 'Code files changed — correctness/test-suite risk.' : 'No code files changed (docs/config only) — nothing for this agent to verify.' },
    { agentType: 'architecture', recommend: hasMigrations || linesAdded > 50, mandatory: false, reason: hasMigrations ? 'Schema/migration files touched.' : linesAdded > 50 ? `${linesAdded} lines added — large enough to risk structural/coupling issues.` : 'Small diff, no migrations — low architectural risk.' },
    { agentType: 'bloat', recommend: linesAdded > 20 || linesRemoved > 20, mandatory: false, reason: (linesAdded > 20 || linesRemoved > 20) ? `${linesAdded} added / ${linesRemoved} removed — enough churn to check for dead code/duplication.` : 'Diff too small to meaningfully check for bloat.' },
    { agentType: 'data_dx', recommend: touchedDataFiles || touchedCiOrTooling, mandatory: false, reason: touchedDataFiles ? 'Data pipeline/migration/analytics files touched.' : touchedCiOrTooling ? 'CI/tooling config touched.' : 'No data pipeline or tooling files touched.' },
    { agentType: 'compliance', recommend: touchedComplianceRelevant, mandatory: false, reason: touchedComplianceRelevant ? 'UI or consent/PII/accessibility-related files touched.' : 'No UI or compliance-relevant files touched.' },
    { agentType: 'ai_era', recommend: touchedAiCallSites, mandatory: false, reason: touchedAiCallSites ? 'Diff contains an LLM call-site pattern (openai/anthropic/completions).' : 'No LLM call-site changes detected in the diff.' },
  ];
  const recommendedAgents = agentRecommendations.filter(a => a.recommend).map(a => a.agentType);
  const mandatoryAgents = agentRecommendations.filter(a => a.mandatory).map(a => a.agentType);

  return {
    riskProfile: {
      overallRisk, touchedDomains, linesAdded, linesRemoved, isVibeRewrite, hasNewDependencies,
      hasMigrations, hasEnvChanges, hasSecuritySensitivePatterns, isDocOrConfigOnly,
      changedFilesSummary: changedFiles.slice(0, 5),
    },
    agentRecommendations,
    recommendedAgents,
    mandatoryAgents,
    parallelizationPlan: [
      { phase: 1, agents: recommendedAgents, reason: 'Dynamic parallel execution based on real diff signals — see agentRecommendations for the per-agent reasoning.' }
    ],
  };
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
    description: 'Parse the git diff and produce a structured risk assessment of what changed.',
    parameters: z.object({
      diff: z.string().optional(),
      changedFiles: z.array(z.string()).optional(),
      repoConfig: z.object({}).passthrough().optional()
    }),
    execute: async (args: any) => {
      const diffRes = await sandbox.exec('git show --format= HEAD');
      const filesRes = await sandbox.exec('git show --format= --name-only HEAD');
      const rawDiff = diffRes.stdout || '';
      const changedFiles = (filesRes.stdout || '').split('\n').filter(Boolean);
      return classifyDiff(rawDiff, changedFiles);
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
    description: 'The REAL, code-enforced dispatch step — call this ONCE per run instead of hand-calling spawn_agent for each agent. It re-derives the diff classification itself (the same real logic behind analyse_commit_diff, not whatever you remember from reading its output) and spawns exactly the recommended set, so the decision is grounded in the actual diff every time rather than left to be reconstructed correctly across several separate tool calls. Pass overrides ONLY when you have a specific, diff-grounded reason to deviate from the recommendation (e.g. search_memory showed this exact path\'s history warrants more or less scrutiny) — "just in case" is not a valid reason and both add/remove entries require reason text. Mandatory agents (currently: security) can never be removed, even via override — that request is silently ignored.',
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
      const { agentTasks } = await import('../../../db/schema.js');
      const { eq, and } = await import('drizzle-orm');

      const diffRes = await sandbox.exec('git show --format= HEAD');
      const filesRes = await sandbox.exec('git show --format= --name-only HEAD');
      const analysis = classifyDiff(diffRes.stdout || '', (filesRes.stdout || '').split('\n').filter(Boolean));

      const addSet = new Set(args.overrides?.add?.map((o: any) => o.agentType) ?? []);
      const removeSet = new Set((args.overrides?.remove ?? []).filter((o: any) => !analysis.mandatoryAgents.includes(o.agentType)).map((o: any) => o.agentType));
      const ignoredRemovals = (args.overrides?.remove ?? []).filter((o: any) => analysis.mandatoryAgents.includes(o.agentType));

      const finalSet = new Set(analysis.recommendedAgents);
      for (const a of addSet) finalSet.add(a as string);
      for (const a of removeSet) finalSet.delete(a as string);
      for (const a of analysis.mandatoryAgents) finalSet.add(a); // real backstop, redundant with agent.queue.ts's own but cheap to double-guarantee here

      const dispatched: string[] = [];
      const skipped: Array<{ agentType: string; reason: string }> = [];
      for (const agentType of finalSet) {
        const [existing] = await db.select().from(agentTasks).where(and(eq(agentTasks.runId, Number(args.runId)), eq(agentTasks.agentId, agentType)));
        if (existing) { skipped.push({ agentType, reason: `Already dispatched (status: ${existing.status}).` }); continue; }
        await db.insert(agentTasks).values({ runId: Number(args.runId), agentId: agentType, status: 'queued', provider: 'openai' });
        await agentQueue.add(`agent-${agentType}`, { agentId: agentType, commitSHA: args.commitSha, repoFullName: args.repoFullName, runId: Number(args.runId) });
        dispatched.push(agentType);
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
      timeoutSeconds: z.number().optional().default(300),
      pollIntervalMs: z.number().optional().default(2000)
    }),
    execute: async (args: { runId: string; timeoutSeconds?: number; pollIntervalMs?: number }) => {
      const { db } = await import('../../../db/index.js');
      const { agentTasks } = await import('../../../db/schema.js');
      const { eq, and, notLike } = await import('drizzle-orm');

      const deadline = Date.now() + (args.timeoutSeconds ?? 300) * 1000;
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
      
      for (const task of tasks) {
        if (task.agentId.startsWith('orchestrator')) continue;
        
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
          const criticals = task.findings.filter((f: any) => f.severity === 'critical' || f.severity === 'CRITICAL');
          criticalFindings.push(...criticals.map(c => ({ ...c, agentType: task.agentId })));
        }
      }
      
      const weightedScore = count > 0 ? Math.round(totalScore / count) : 100;
      
      return {
        weightedScore,
        criticalFindings,
        allBlockReasons: criticalFindings.map(c => `[${c.agentType}] ${c.title}`),
        agentScoreSummary,
        conflictingSignals: []
      };
    }
  },

  post_github_check_run: {
    description: 'Create or update the GitHub Check Run on the PR.',
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
      return { checkRunId: 1001, htmlUrl: "https://github.com/check", status: "completed" };
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
      return { rollbackPrNumber: 99, rollbackPrUrl: "https://github.com/pull/99", notificationsSent: [] };
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
      return { messageTs: "12345.678", channelId: "C12345" };
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
      return { messageId: "email_123", accepted: args.to };
    }
  },

  query_run_history: {
    description: 'Load the last N runs for this repo from Postgres.',
    parameters: z.object({
      repoId: z.string(),
      limit: z.number().default(10),
      agentType: z.string().optional()
    }),
    execute: async (args: any) => {
      return {
        runs: [],
        scoretrend: "stable",
        averageScore: 90
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
      
      agentSummaries: z.array(z.object({
        agentType: z.string(),
        score: z.number(),
        weight: z.number(),
        gateDecision: z.string(),
        criticalCount: z.number(),
        highCount: z.number(),
        mediumCount: z.number(),
        durationMs: z.number(),
        status: z.enum(["completed", "failed", "skipped", "timeout"])
      })),
      
      criticalFindings: z.array(z.object({
        agentType: z.string(),
        title: z.string(),
        file: z.string(),
        line: z.number().nullable(),
        severity: z.literal("CRITICAL"),
        toolName: z.string(),
        rawEvidence: z.string(),
        suggestedFix: z.string()
      })),
      
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
      rollbackPrUrl: z.string().nullable(),
      
      toolsExecuted: z.array(z.object({
        toolName: z.string(),
        calledAt: z.string().datetime(),
        durationMs: z.number(),
        resultSummary: z.string()
      }))
    }),
    execute: async (args: any) => {
      console.log(`[Orchestrator] Final Decision for Run ${args.runId}: ${args.gateDecision}`);
      console.log(`[Orchestrator] Rationale: ${args.rationale}`);
      return { success: true, message: "Decision submitted successfully.", gateDecision: args.gateDecision };
    }
  }
});
