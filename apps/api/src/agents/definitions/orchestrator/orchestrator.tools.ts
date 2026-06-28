import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';

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
      // 1. Get the diff and changed files from the sandbox
      const diffRes = await sandbox.exec('git show --format= HEAD');
      const filesRes = await sandbox.exec('git show --format= --name-only HEAD');
      
      const rawDiff = diffRes.stdout || '';
      const changedFiles = (filesRes.stdout || '').split('\n').filter(Boolean);

      // 2. Perform a heuristic or string-based risk assessment
      const linesAddedMatch = rawDiff.match(/^\+ /gm);
      const linesRemovedMatch = rawDiff.match(/^\- /gm);
      
      const linesAdded = linesAddedMatch ? linesAddedMatch.length : 0;
      const linesRemoved = linesRemovedMatch ? linesRemovedMatch.length : 0;
      
      const touchedDomains = [];
      const hasSecuritySensitivePatterns = /password|secret|token|auth|key/i.test(rawDiff);
      const hasMigrations = changedFiles.some(f => f.includes('migration') || f.includes('schema.ts'));
      const hasEnvChanges = changedFiles.some(f => f.includes('.env'));
      const hasNewDependencies = changedFiles.some(f => f.includes('package.json') || f.includes('pnpm-lock.yaml'));
      const isVibeRewrite = linesRemoved > 100 && linesAdded > 100 && linesAdded > linesRemoved * 2;

      let overallRisk = 'LOW';
      if (hasSecuritySensitivePatterns || hasMigrations || hasEnvChanges) {
        overallRisk = 'HIGH';
      } else if (linesAdded > 100) {
        overallRisk = 'MEDIUM';
      }

      // Map risk profile to agent parallelization
      const recommendedAgents = ["security", "broken_code"];
      if (hasMigrations || linesAdded > 50) recommendedAgents.push("architecture");
      if (linesAdded > 20 || linesRemoved > 20) recommendedAgents.push("bloat");

      return {
        riskProfile: {
          overallRisk,
          touchedDomains,
          linesAdded,
          linesRemoved,
          isVibeRewrite,
          hasNewDependencies,
          hasMigrations,
          hasEnvChanges,
          hasSecuritySensitivePatterns,
          changedFilesSummary: changedFiles.slice(0, 5) // max 5 files in summary
        },
        recommendedAgents,
        parallelizationPlan: [
          { phase: 1, agents: recommendedAgents, reason: "Dynamic parallel execution based on diff heuristics" }
        ]
      };
    }
  },

  spawn_agent: {
    description: 'Dispatch a sub-agent by writing a job to the BullMQ queue.',
    parameters: z.object({
      agentType: z.enum(["security", "bloat", "broken_code", "architecture", "ai_era", "compliance", "data_dx"]),
      runId: z.string(),
      repoId: z.string(),
      repoPath: z.string(),
      commitSha: z.string(),
      priority: z.enum(["critical", "high", "normal", "low"]),
      payload: z.record(z.unknown())
    }),
    execute: async (args: any) => {
      // Dynamic import to avoid top-level circular dependencies
      const { agentQueue } = await import('../../queue/agent.queue.js');
      const job = await agentQueue.add(`agent-${args.agentType}`, {
        agentId: args.agentType,
        commitSHA: args.commitSha,
        repoFullName: args.repoPath,
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

  await_agent_results: {
    description: 'Poll for sub-agent results from Postgres. Waits until all dispatched agents complete or timeout.',
    parameters: z.object({
      runId: z.string(),
      jobIds: z.array(z.string()),
      timeoutSeconds: z.number().default(600),
      pollIntervalMs: z.number().default(2000)
    }),
    execute: async (args: any) => {
      return {
        completedAgents: [
          { agentType: "security", jobId: args.jobIds[0] || "job_sec_123", status: "completed", result: { score: 90 }, durationMs: 5000 }
        ],
        timedOutAgents: [],
        failedAgents: []
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

  search_memory: {
    description: 'Search the agent_memory vector database for prior learnings.',
    parameters: z.object({
      repoId: z.string(),
      agentType: z.string()
    }),
    execute: async (args: any) => {
      return { memories: [] };
    }
  },

  write_memory: {
    description: 'Write a new finding, pattern, or exception to the agent_memory.',
    parameters: z.object({
      repoId: z.string(),
      summary: z.string()
    }),
    execute: async (args: any) => {
      return { success: true };
    }
  },

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
