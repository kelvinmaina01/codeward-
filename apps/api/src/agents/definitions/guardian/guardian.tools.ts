import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';

export const createGuardianTools = (sandbox: SandboxHandle) => {
  return {
    post_initial_status_comment: {
      description: 'Post "analysis running" comment immediately when PR opens.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        commitSha: z.string(),
        estimatedDurationSeconds: z.number()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          commentId: 1001,
          htmlUrl: `https://github.com/codeward/repo/pull/${args.pullRequestNumber}#issuecomment-1001`
        };
      }
    },

    create_pull_request_review: {
      description: 'Submit a FORMAL GitHub PR review — Approved or Request Changes.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
        body: z.string(),
        comments: z.array(z.object({
          path: z.string(),
          line: z.number(),
          body: z.string()
        })).optional().default([])
      }),
      execute: async (args: any) => {
        return {
          success: true,
          reviewId: 2001,
          htmlUrl: `https://github.com/codeward/repo/pull/${args.pullRequestNumber}#pullrequestreview-2001`
        };
      }
    },

    add_pull_request_review_comment: {
      description: 'Post an inline comment on a SPECIFIC LINE of the diff.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        commitId: z.string(),
        path: z.string(),
        line: z.number(),
        body: z.string()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          commentId: 3001,
          htmlUrl: `https://github.com/codeward/repo/pull/${args.pullRequestNumber}#discussion_r3001`
        };
      }
    },

    create_issue: {
      description: 'Create a GitHub Issue for every unresolved Critical or High finding.',
      parameters: z.object({
        repoId: z.string(),
        title: z.string(),
        body: z.string(),
        labels: z.array(z.string()),
        assignees: z.array(z.string()),
        milestone: z.number().optional()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          issueNumber: 4001,
          htmlUrl: `https://github.com/codeward/repo/issues/4001`
        };
      }
    },

    add_labels_to_issue: {
      description: 'Apply structured labels to created issues.',
      parameters: z.object({
        repoId: z.string(),
        issueNumber: z.number(),
        labels: z.array(z.string())
      }),
      execute: async (args: any) => {
        return {
          success: true
        };
      }
    },

    reply_to_pr_comment: {
      description: 'Reply to a developer comment in a PR thread.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        commentId: z.number(),
        body: z.string()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          replyCommentId: 5001,
          htmlUrl: `https://github.com/codeward/repo/pull/${args.pullRequestNumber}#discussion_r5001`
        };
      }
    },

    update_existing_comment: {
      description: 'Update the initial "running" status comment with the final results.',
      parameters: z.object({
        repoId: z.string(),
        commentId: z.number(),
        newBody: z.string()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          htmlUrl: `https://github.com/codeward/repo/issues/comments/${args.commentId}`
        };
      }
    },

    create_or_update_file: {
      description: 'Commit auto-fixed code back to the PR branch.',
      parameters: z.object({
        repoId: z.string(),
        branch: z.string(),
        filePath: z.string(),
        content: z.string(),
        commitMessage: z.string(),
        sha: z.string().optional() // Make optional in test schema to avoid rigid errors if sha is absent initially
      }),
      execute: async (args: any) => {
        return {
          success: true,
          commitSha: 'autofix123'
        };
      }
    },

    create_branch: {
      description: 'For User Type B (audit mode), create a codeward/audit-fixes branch.',
      parameters: z.object({
        repoId: z.string(),
        branchName: z.string(),
        fromSha: z.string()
      }),
      execute: async (args: any) => {
        return {
          success: true,
          branchName: args.branchName
        };
      }
    },

    create_pull_request: {
      description: 'Open a PR for the audit branch.',
      parameters: z.object({
        repoId: z.string(),
        title: z.string(),
        body: z.string(),
        head: z.string(),
        base: z.string(),
        draft: z.boolean().default(false)
      }),
      execute: async (args: any) => {
        return {
          success: true,
          pullRequestNumber: 48,
          htmlUrl: 'https://github.com/codeward/repo/pull/48'
        };
      }
    },

    merge_pull_request: {
      description: 'Merge the PR after ALL gates pass AND human explicitly approves via dashboard.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        commitTitle: z.string(),
        commitMessage: z.string(),
        mergeMethod: z.enum(["merge", "squash", "rebase"])
      }),
      execute: async (args: any) => {
        return {
          success: true,
          merged: true,
          sha: 'merged123'
        };
      }
    },

    get_pull_request: {
      description: 'Read the full PR — diff, description, reviewers, status.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number()
      }),
      execute: async (args: any) => {
        return {
          title: 'feat: add payment webhook handler',
          body: 'Adds Stripe webhook processing',
          state: 'open',
          head: { sha: 'abc1234', ref: 'feat/payment-webhook' },
          base: { sha: 'mainsha', ref: 'main' },
          changedFiles: ['src/webhooks/stripe.ts']
        };
      }
    },

    get_file_contents: {
      description: 'Read specific files from the repo.',
      parameters: z.object({
        repoId: z.string(),
        filePath: z.string(),
        ref: z.string().optional()
      }),
      execute: async (args: any) => {
        return {
          content: 'export const MOCK_FILE_CONTENT = true;\n',
          size: 38
        };
      }
    },

    list_issues: {
      description: 'Check for existing open issues on the same finding before creating duplicates.',
      parameters: z.object({
        repoId: z.string(),
        state: z.enum(["open", "closed", "all"]).default("open")
      }),
      execute: async (args: any) => {
        return {
          issues: []
        };
      }
    },

    search_memory: {
      description: 'Check team prior decisions.',
      parameters: z.object({
        repoId: z.string(),
        query: z.string()
      }),
      execute: async (args: any) => {
        return {
          memories: []
        };
      }
    },

    write_memory: {
      description: 'Persist learnings after run.',
      parameters: z.object({
        repoId: z.string(),
        content: z.string()
      }),
      execute: async (args: any) => {
        return { success: true };
      }
    }
  };
};
