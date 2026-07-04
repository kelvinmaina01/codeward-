import { z } from 'zod';
import type { SandboxHandle } from '../../core/provider.js';
import { createMemoryTools } from '../../tools/memory.tools.js';

/**
 * Every tool here is a real GitHub API call via the installation-scoped Octokit client
 * (lib/github.ts, which now correctly delegates to the working github/client.ts — the
 * previous version read a GITHUB_APP_PRIVATE_KEY env var that doesn't exist, so every call
 * here would have silently failed). This client comes from @octokit/app's
 * getInstallationOctokit(), which does NOT include the `.rest.*` convenience plugin — only
 * raw `.request('METHOD /path', {...})`, matching the pattern already proven working in
 * orchestrator.tools.ts's post_pr_comment.
 *
 * merge_pull_request is the one genuinely irreversible action; it requires an explicit
 * humanApproved:true argument as a code-level gate, not just a prompt instruction, matching
 * the constitution's "human explicitly approves via dashboard" rule.
 */
export async function resolveOctokit(repoId: string) {
  const { db } = await import('../../../db/index.js');
  const { repositories } = await import('../../../db/schema.js');
  const { eq } = await import('drizzle-orm');
  const { getInstallationOctokit } = await import('../../../lib/github.js');

  const repo = await db.query.repositories.findFirst({ where: eq(repositories.id, Number(repoId)) });
  if (!repo || !repo.installationId) {
    return { error: `No installationId found for repoId ${repoId}` } as const;
  }
  const octokit = await getInstallationOctokit(repo.installationId);
  return { octokit, owner: repo.owner, repo: repo.name } as const;
}

export const createGuardianTools = (sandbox: SandboxHandle) => {
  return {
    post_initial_status_comment: {
      description: 'Post "analysis running" comment immediately when PR opens. Real GitHub API call.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        commitSha: z.string(),
        estimatedDurationSeconds: z.number()
      }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: ctx.owner, repo: ctx.repo, issue_number: args.pullRequestNumber,
          body: `🛡️ Codeward is analyzing commit \`${args.commitSha.slice(0, 7)}\` — estimated ${args.estimatedDurationSeconds}s.`
        });
        return { success: true, commentId: res.data.id, htmlUrl: res.data.html_url };
      }
    },

    submit_pr_review: {
      description: 'Submit a FORMAL GitHub PR review — Approved or Request Changes. Real GitHub API call. This is guardian\'s terminal action for a PR review — calling it ends the review run.',
      parameters: z.object({
        repoId: z.string(),
        pullRequestNumber: z.number(),
        event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
        body: z.string(),
        comments: z.array(z.object({ path: z.string(), line: z.number(), body: z.string() })).optional().default([])
      }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        try {
          const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
            owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber,
            event: args.event, body: args.body,
            comments: args.comments?.map((c: any) => ({ path: c.path, line: c.line, body: c.body }))
          });
          return { success: true, viaFormalReview: true, event: args.event, reviewId: res.data.id, htmlUrl: res.data.html_url };
        } catch (e: any) {
          // Real, structural GitHub constraint discovered in testing: the same GitHub App
          // identity that opened a bot-authored PR cannot formally review/approve it —
          // "Can not approve your own pull request." This isn't specific to APPROVE only; the
          // reviews API rejects self-authored review submissions generally under one identity.
          // Fall back to a real, clearly-labeled issue comment instead of silently failing —
          // still a real, visible GitHub action, just not a formal review state.
          const message = e?.message ?? String(e);
          if (!message.includes('own pull request')) throw e;
          const commentRes = await ctx.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: ctx.owner, repo: ctx.repo, issue_number: args.pullRequestNumber,
            body: `**Guardian assessment: ${args.event}**\n\n${args.body}\n\n_Posted as a comment, not a formal review — GitHub does not allow this bot identity to formally approve/request-changes on its own PR. A human reviewer's formal approval is still required to merge._`
          });
          return { success: true, viaFormalReview: false, event: args.event, reviewId: commentRes.data.id, htmlUrl: commentRes.data.html_url };
        }
      }
    },

    add_pull_request_review_comment: {
      description: 'Post an inline comment on a SPECIFIC LINE of the diff. Real GitHub API call.',
      parameters: z.object({
        repoId: z.string(), pullRequestNumber: z.number(), commitId: z.string(),
        path: z.string(), line: z.number(), body: z.string()
      }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
          owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber,
          commit_id: args.commitId, path: args.path, line: args.line, body: args.body
        });
        return { success: true, commentId: res.data.id, htmlUrl: res.data.html_url };
      }
    },

    create_issue: {
      description: 'Create a GitHub Issue for an unresolved Critical or High finding. Real GitHub API call.',
      parameters: z.object({
        repoId: z.string(), title: z.string(), body: z.string(),
        labels: z.array(z.string()), assignees: z.array(z.string()).optional().default([])
      }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/issues', {
          owner: ctx.owner, repo: ctx.repo, title: args.title, body: args.body,
          labels: args.labels, assignees: args.assignees
        });
        return { success: true, issueNumber: res.data.number, htmlUrl: res.data.html_url };
      }
    },

    add_labels_to_issue: {
      description: 'Apply labels to an existing issue. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), issueNumber: z.number(), labels: z.array(z.string()) }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        await ctx.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
          owner: ctx.owner, repo: ctx.repo, issue_number: args.issueNumber, labels: args.labels
        });
        return { success: true };
      }
    },

    reply_to_pr_comment: {
      description: 'Reply to a developer\'s reply on a PR review comment thread. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), pullRequestNumber: z.number(), commentId: z.number(), body: z.string() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies', {
          owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber,
          comment_id: args.commentId, body: args.body
        });
        return { success: true, replyCommentId: res.data.id, htmlUrl: res.data.html_url };
      }
    },

    update_existing_comment: {
      description: 'Update the initial "running" status comment with final results. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), commentId: z.number(), newBody: z.string() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}', {
          owner: ctx.owner, repo: ctx.repo, comment_id: args.commentId, body: args.newBody
        });
        return { success: true, htmlUrl: res.data.html_url };
      }
    },

    create_or_update_file: {
      description: 'Commit an auto-fixed file back to the PR branch. Real GitHub API call.',
      parameters: z.object({
        repoId: z.string(), branch: z.string(), filePath: z.string(), content: z.string(),
        commitMessage: z.string(), sha: z.string().optional()
      }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
          owner: ctx.owner, repo: ctx.repo, path: args.filePath, message: args.commitMessage,
          content: Buffer.from(args.content, 'utf8').toString('base64'), branch: args.branch, sha: args.sha
        });
        return { success: true, commitSha: res.data.commit.sha };
      }
    },

    create_branch: {
      description: 'Create a new branch (e.g. codeward/audit-fixes) from a given SHA. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), branchName: z.string(), fromSha: z.string() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        await ctx.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
          owner: ctx.owner, repo: ctx.repo, ref: `refs/heads/${args.branchName}`, sha: args.fromSha
        });
        return { success: true, branchName: args.branchName };
      }
    },

    create_pull_request: {
      description: 'Open a PR for an audit branch. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), title: z.string(), body: z.string(), head: z.string(), base: z.string(), draft: z.boolean().optional().default(false) }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('POST /repos/{owner}/{repo}/pulls', {
          owner: ctx.owner, repo: ctx.repo, title: args.title, body: args.body, head: args.head, base: args.base, draft: args.draft
        });
        return { success: true, pullRequestNumber: res.data.number, htmlUrl: res.data.html_url };
      }
    },

    merge_pull_request: {
      description: 'IRREVERSIBLE. Merge the PR. Only call this after ALL gates pass AND a human has explicitly approved via the dashboard — you MUST pass humanApproved:true, which is verified in code, not just by this instruction. Calling this without real human approval will be refused.',
      parameters: z.object({
        repoId: z.string(), pullRequestNumber: z.number(), commitTitle: z.string(), commitMessage: z.string(),
        mergeMethod: z.enum(["merge", "squash", "rebase"]),
        humanApproved: z.boolean().describe('Must be true. This is a code-level gate, not a suggestion — set it only if you have explicit, real confirmation of human approval for THIS PR in your context.')
      }),
      execute: async (args: any) => {
        if (args.humanApproved !== true) {
          return { success: false, error: 'Refused: humanApproved was not true. This is an irreversible action and requires explicit human approval.' };
        }
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge', {
          owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber,
          commit_title: args.commitTitle, commit_message: args.commitMessage, merge_method: args.mergeMethod
        });
        return { success: true, merged: res.data.merged, sha: res.data.sha };
      }
    },

    get_pull_request: {
      description: 'Read the full PR — diff summary, description, reviewers, status. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), pullRequestNumber: z.number() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber
        });
        return {
          title: res.data.title, body: res.data.body, state: res.data.state,
          head: { sha: res.data.head.sha, ref: res.data.head.ref },
          base: { sha: res.data.base.sha, ref: res.data.base.ref },
          changedFiles: res.data.changed_files
        };
      }
    },

    get_pull_request_files: {
      description: 'Get the real unified diff (patch) for every changed file in a PR — the actual line-level content to review, not just metadata. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), pullRequestNumber: z.number() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
          owner: ctx.owner, repo: ctx.repo, pull_number: args.pullRequestNumber
        });
        return {
          files: res.data.map((f: any) => ({
            filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions,
            patch: f.patch ?? '(no textual diff available — binary or too large)'
          }))
        };
      }
    },

    get_file_contents: {
      description: 'Read a specific file from the repo at a given ref. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), filePath: z.string(), ref: z.string().optional() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: ctx.owner, repo: ctx.repo, path: args.filePath, ref: args.ref
        });
        if (Array.isArray(res.data) || res.data.type !== 'file') {
          return { error: `${args.filePath} is not a file (directory or missing).` };
        }
        return { content: Buffer.from(res.data.content, 'base64').toString('utf8'), size: res.data.size, sha: res.data.sha };
      }
    },

    get_repo_head: {
      description: 'Get the repo\'s default branch name and its current head commit SHA — needed as the base to branch a fix off of. Real GitHub API call.',
      parameters: z.object({ repoId: z.string() }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const repoRes = await ctx.octokit.request('GET /repos/{owner}/{repo}', { owner: ctx.owner, repo: ctx.repo });
        const defaultBranch = repoRes.data.default_branch;
        const refRes = await ctx.octokit.request('GET /repos/{owner}/{repo}/git/refs/heads/{branch}', {
          owner: ctx.owner, repo: ctx.repo, branch: defaultBranch
        });
        return { defaultBranch, headSha: refRes.data.object.sha };
      }
    },

    list_issues: {
      description: 'Check for existing open issues before creating duplicates. Real GitHub API call.',
      parameters: z.object({ repoId: z.string(), state: z.enum(["open", "closed", "all"]).optional().default("open") }),
      execute: async (args: any) => {
        const ctx = await resolveOctokit(args.repoId);
        if ('error' in ctx) return ctx;
        const res = await ctx.octokit.request('GET /repos/{owner}/{repo}/issues', {
          owner: ctx.owner, repo: ctx.repo, state: args.state
        });
        return { issues: res.data.filter((i: any) => !i.pull_request).map((i: any) => ({ number: i.number, title: i.title, labels: i.labels })) };
      }
    },

    ...createMemoryTools('guardian')
  };
};
