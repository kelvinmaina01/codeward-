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
      return {
        config: {
          tier: "pro",
          strictMode: true,
          highStakesDomains: ["payments", "auth"],
          excludedPaths: [],
          customThresholds: {
            securityMinScore: 80,
            bloatMaxFindings: 20,
            architectureMinScore: 70
          },
          agentOverrides: {},
          notifyChannels: [{ type: "slack", config: {} }]
        }
      };
    }
  },

  analyse_commit_diff: {
    description: 'Parse the git diff and produce a structured risk assessment of what changed.',
    parameters: z.object({
      diff: z.string(),
      changedFiles: z.array(z.string()),
      repoConfig: z.object({}).passthrough()
    }),
    execute: async (args: any) => {
      return {
        riskProfile: {
          overallRisk: "HIGH",
          touchedDomains: ["auth"],
          linesAdded: 50,
          linesRemoved: 10,
          isVibeRewrite: false,
          hasNewDependencies: false,
          hasMigrations: false,
          hasEnvChanges: false,
          hasSecuritySensitivePatterns: true,
          changedFilesSummary: []
        },
        recommendedAgents: ["security", "broken_code", "architecture"],
        parallelizationPlan: [
          { phase: 1, agents: ["security", "broken_code", "architecture"], reason: "Parallel execution" }
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
      return {
        jobId: `job_${args.agentType}_123`,
        agentType: args.agentType,
        estimatedDurationSeconds: 120,
        queuePosition: 1
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
      agentResults: z.array(z.object({
        agentType: z.string(),
        score: z.number(),
        weight: z.number(),
        gateDecision: z.enum(["PASS", "BLOCK", "WARN"]),
        criticalCount: z.number(),
        highCount: z.number(),
        findings: z.array(z.object({}).passthrough())
      }))
    }),
    execute: async (args: any) => {
      return {
        weightedScore: 85,
        criticalFindings: [],
        allBlockReasons: [],
        agentScoreSummary: [],
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
      return { commentId: 2001, htmlUrl: "https://github.com/comment" };
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
      result: z.object({}).passthrough()
    }),
    execute: async (args: any) => {
      return { stored: true, runId: "run_123" };
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
      return { success: true, message: "Decision submitted successfully." };
    }
  }
});
