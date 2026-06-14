import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';

export const createChatTools = (sandbox: SandboxHandle) => {
  return {
    query_run_history: {
      description: 'Fetch recent agent run results for a repo.',
      parameters: z.object({
        repoId: z.string(),
        limit: z.number().default(5),
        agentType: z.string().optional(),
        severity: z.string().optional(),
        since: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          runs: [
            {
              runId: 'run_mock_001',
              commitSha: 'chatmock123',
              executedAt: new Date().toISOString(),
              overallScore: 85,
              gateDecision: 'WARN',
              agentResults: {
                security: {
                  score: 100,
                  findings: []
                },
                bloat: {
                  score: 70,
                  findings: [{ severity: 'MEDIUM', title: 'Dead code detected', file: 'src/old.ts', line: 12 }]
                }
              }
            }
          ]
        };
      }
    },

    spawn_agent: {
      description: 'Spawn any sub-agent on demand in response to a user question.',
      parameters: z.object({
        agentType: z.enum(["security", "bloat", "broken_code", "architecture", "ai_era", "compliance"]),
        repoId: z.string(),
        repoPath: z.string(),
        priority: z.enum(["high", "normal"]),
        userQuestion: z.string()
      }),
      execute: async (args: any) => {
        return {
          jobId: `job_${args.agentType}_${Date.now()}`,
          estimatedSeconds: 45
        };
      }
    },

    await_spawned_agent: {
      description: 'Wait for a spawned agent to complete and return its result.',
      parameters: z.object({
        jobId: z.string(),
        timeoutSeconds: z.number().default(300)
      }),
      execute: async (args: any) => {
        return {
          score: 100,
          status: 'completed',
          findings: []
        };
      }
    },

    read_repo_file: {
      description: 'Read any file in the connected repo.',
      parameters: z.object({
        repoId: z.string(),
        filePath: z.string(),
        startLine: z.number().optional(),
        endLine: z.number().optional()
      }),
      execute: async (args: any) => {
        return {
          content: 'export const mockFile = true;\n',
          totalLines: 1,
          language: 'typescript'
        };
      }
    },

    explain_debt_item: {
      description: 'Provide a detailed technical explanation of a specific debt finding.',
      parameters: z.object({
        findingId: z.string(),
        includeCodeExample: z.boolean(),
        includeFixExample: z.boolean(),
        audienceLevel: z.enum(["junior", "senior", "manager"])
      }),
      execute: async (args: any) => {
        return {
          explanation: 'This code leaves an S3 bucket open to public writes.',
          whyItMatters: 'An attacker could overwrite your bucket files or rack up AWS bills.',
          businessImpact: 'High risk of data loss and financial impact.',
          fixInstructions: 'Change the bucket ACL to private.',
          estimatedFixTimeMinutes: 10,
          codeBeforeExample: 'new s3.Bucket(this, "Bucket", { blockPublicAccess: false });',
          codeAfterExample: 'new s3.Bucket(this, "Bucket", { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL });'
        };
      }
    },

    compare_repos: {
      description: 'Compare the debt profile and health scores across multiple repos.',
      parameters: z.object({
        repoIds: z.array(z.string()),
        compareOn: z.array(z.enum(["security_score", "bloat_score", "overall_score", "critical_count"]))
      }),
      execute: async (args: any) => {
        return {
          comparison: [
            {
              repoId: args.repoIds[0],
              repoName: 'primary-repo',
              scores: { overall_score: 92 },
              ranking: 1
            }
          ],
          insights: ['primary-repo is doing better than the others.']
        };
      }
    },

    trigger_refactor: {
      description: 'Apply an auto-refactor suggested by the Bloat Agent — opens a PR.',
      parameters: z.object({
        repoId: z.string(),
        findingId: z.string(),
        branchName: z.string(),
        commitMessage: z.string()
      }),
      execute: async (args: any) => {
        return {
          prNumber: 42,
          prUrl: 'https://github.com/codeward/repo/pull/42',
          filesChanged: ['src/old.ts'],
          linesRemoved: 150
        };
      }
    },

    get_fix_priority_list: {
      description: 'Produce a prioritized action list — what to fix first, with estimated time.',
      parameters: z.object({
        repoId: z.string(),
        runId: z.string().optional(),
        availableHours: z.number(),
        focusArea: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          priorityList: [
            {
              rank: 1,
              findingId: 'find_1',
              title: 'Fix S3 Bucket ACL',
              severity: 'CRITICAL',
              estimatedFixMinutes: 10,
              impact: 'Unblocks deployment',
              file: 'infra/storage.ts',
              line: 45
            }
          ],
          totalEstimatedHours: 0.5,
          canCompleteInBudget: true
        };
      }
    },

    get_health_trend: {
      description: 'Get the health score trend over time for one or more repos.',
      parameters: z.object({
        repoId: z.string(),
        timeframeDays: z.number().default(30),
        metric: z.enum(["overall", "security", "bloat", "broken_code", "architecture"])
      }),
      execute: async (args: any) => {
        return {
          currentScore: 92,
          scoreNDaysAgo: 85,
          trend: 'improving',
          changePercent: 8.2,
          keyEvents: [
            {
              date: new Date().toISOString(),
              commitSha: 'chatmock123',
              event: 'Fixed S3 Bucket ACL',
              scoreImpact: 5
            }
          ]
        };
      }
    },

    search_findings: {
      description: 'Full-text search across all findings in the run history.',
      parameters: z.object({
        repoId: z.string(),
        query: z.string(),
        category: z.string().optional(),
        severity: z.string().optional(),
        limit: z.number().default(10)
      }),
      execute: async (args: any) => {
        return {
          findings: []
        };
      }
    },

    read_repo_config: {
      description: 'Read the repos .codeward.json config.',
      parameters: z.object({
        repoPath: z.string()
      }),
      execute: async (args: any) => {
        return {
          config: {
            thresholds: {
              security: 90,
              bloat: 70
            }
          }
        };
      }
    },

    dismiss_finding: {
      description: 'Mark a finding as dismissed with a reason.',
      parameters: z.object({
        findingId: z.string(),
        reason: z.string(),
        dismissedBy: z.string(),
        expiresAt: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          dismissed: true,
          memoryWritten: true,
          expiresAt: null
        };
      }
    }
  };
};
