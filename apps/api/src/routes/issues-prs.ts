import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc, isNotNull } from 'drizzle-orm';
import { resolveOctokit } from '../agents/definitions/guardian/guardian.tools.js';

export const issuesPrsRouter = new Hono();

/**
 * Real "Issues and PRs" feed. Issues are the real GitHub issues Codeward's escalation step
 * opens when an agent finds a CRITICAL/HIGH problem it can't auto-fix (escalation.service.ts) —
 * fetched live from GitHub so state/comments are always current, never a stale local copy. PRs
 * combine two real sources: Codeward's own auto-fix PRs (merge_approvals, which already tracks
 * merged/rejected/auto_merged/pending status from our own actions) and human-opened PRs that
 * guardian reviewed (runs.prNumber + agent_tasks.reportMeta.humanPrReview), enriched with live
 * GitHub state since we never wrote a status field for those.
 */
async function accessibleRepos(userId: string) {
  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember).where(eq(schema.organizationMember.userId, userId));
  const orgIds = userOrgs.map((o) => o.orgId);
  const conds = [eq(schema.repositories.userId, userId)];
  if (orgIds.length > 0) conds.push(inArray(schema.repositories.orgId, orgIds));
  return db.select().from(schema.repositories).where(or(...conds));
}

/** GET /api/issues-prs/issues — real GitHub issues Codeward has escalated, live from GitHub. */
issuesPrsRouter.get('/issues', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repos = (await accessibleRepos(session.user.id)).filter((r) => r.installationId);
  if (repos.length === 0) return c.json({ issues: [] });

  const issues: any[] = [];
  for (const repo of repos) {
    const ctx = await resolveOctokit(String(repo.id));
    if ('error' in ctx) continue;
    try {
      const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/issues', {
        owner: ctx.owner, repo: ctx.repo, labels: 'codeward', state: 'all', per_page: 30, sort: 'created', direction: 'desc',
      });
      for (const issue of res.data) {
        if (issue.pull_request) continue; // GitHub's issues endpoint also returns PRs — real issues only
        const labels = (issue.labels ?? []).map((l: any) => (typeof l === 'string' ? l : l.name));
        const severity = ['critical', 'high'].find((s) => labels.includes(s))?.toUpperCase() ?? null;
        issues.push({
          id: `${repo.id}-${issue.number}`,
          repoId: repo.id,
          repoFullName: repo.fullName,
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body ?? '',
          state: issue.state, // open | closed
          severity,
          htmlUrl: issue.html_url,
          comments: issue.comments,
          createdAt: issue.created_at,
          closedAt: issue.closed_at,
        });
      }
    } catch (e: any) {
      console.error(`[IssuesAndPRs] real issues fetch failed for ${repo.fullName}:`, e.message);
    }
  }

  issues.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({ issues: issues.slice(0, 100) });
});

/** GET /api/issues-prs/issues/:repoId/:issueNumber/comments — real GitHub comment thread ("was it worked on?"). */
issuesPrsRouter.get('/issues/:repoId/:issueNumber/comments', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  const issueNumber = Number(c.req.param('issueNumber'));
  if (!Number.isFinite(repoId) || !Number.isFinite(issueNumber)) return c.json({ error: 'Invalid params' }, 400);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  const repos = await accessibleRepos(session.user.id);
  if (!repos.some((r) => r.id === repoId)) return c.json({ error: 'Forbidden' }, 403);

  const ctx = await resolveOctokit(String(repoId));
  if ('error' in ctx) return c.json({ error: ctx.error }, 502);

  try {
    const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: ctx.owner, repo: ctx.repo, issue_number: issueNumber,
    });
    return c.json({
      comments: res.data.map((cmt: any) => ({
        id: cmt.id, author: cmt.user?.login, authorAvatar: cmt.user?.avatar_url, body: cmt.body, createdAt: cmt.created_at, htmlUrl: cmt.html_url,
      })),
    });
  } catch (e: any) {
    return c.json({ error: `Real GitHub comments fetch failed: ${e.message}` }, 502);
  }
});

/** GET /api/issues-prs/prs — real auto-fix PRs (merge_approvals) + real human-opened PRs guardian reviewed. */
issuesPrsRouter.get('/prs', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repos = await accessibleRepos(session.user.id);
  if (repos.length === 0) return c.json({ prs: [] });
  const repoIds = repos.map((r) => r.id);
  const repoById = new Map(repos.map((r) => [r.id, r]));

  const prs: any[] = [];

  // Source 1: Codeward's own auto-fix PRs — status already tracked authoritatively by our own
  // approve/reject/auto-merge flow, no need to re-fetch live state.
  const approvals = await db.select().from(schema.mergeApprovals)
    .where(inArray(schema.mergeApprovals.repoId, repoIds)).orderBy(desc(schema.mergeApprovals.createdAt)).limit(50);
  for (const a of approvals) {
    const repo = repoById.get(a.repoId);
    prs.push({
      id: `autofix-${a.id}`,
      kind: 'autofix',
      repoId: a.repoId,
      repoFullName: repo?.fullName ?? 'unknown',
      pullRequestNumber: a.pullRequestNumber,
      prUrl: a.prUrl,
      prTitle: a.prTitle,
      agentId: a.agentId,
      guardianVerdict: a.guardianVerdict,
      maxSeverity: a.maxSeverity,
      mode: a.mode,
      deadlineAt: a.deadlineAt,
      status: a.status, // pending | approved | rejected | auto_merged | merge_failed | merging
      decidedBy: a.decidedBy,
      decisionNote: a.decisionNote,
      decidedAt: a.decidedAt,
      createdAt: a.createdAt,
    });
  }

  // Source 2: human-opened PRs guardian reviewed — live GitHub state fetched per-PR since we
  // never persisted a status field for these (they're not ours to merge/reject).
  const humanRuns = await db.select().from(schema.runs)
    .where(and(inArray(schema.runs.repoId, repoIds), isNotNull(schema.runs.prNumber)))
    .orderBy(desc(schema.runs.createdAt)).limit(50);
  if (humanRuns.length > 0) {
    const tasks = await db.select().from(schema.agentTasks)
      .where(and(inArray(schema.agentTasks.runId, humanRuns.map((r) => r.id)), eq(schema.agentTasks.agentId, 'orchestrator_phase3')));
    const reviewByRunId = new Map(tasks.map((t) => [t.runId, (t.reportMeta as any)?.humanPrReview ?? null]));

    for (const run of humanRuns) {
      if (run.repoId == null) continue;
      const repo = repoById.get(run.repoId);
      if (!repo) continue;
      const ctx = await resolveOctokit(String(run.repoId));
      let live: any = null;
      if (!('error' in ctx)) {
        try {
          const res: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner: ctx.owner, repo: ctx.repo, pull_number: run.prNumber!,
          });
          live = res.data;
        } catch (e: any) {
          console.error(`[IssuesAndPRs] live PR fetch failed for ${repo.fullName}#${run.prNumber}:`, e.message);
        }
      }
      prs.push({
        id: `human-${run.id}`,
        kind: 'human',
        repoId: run.repoId,
        repoFullName: repo.fullName,
        pullRequestNumber: run.prNumber,
        prUrl: live?.html_url ?? `https://github.com/${repo.fullName}/pull/${run.prNumber}`,
        prTitle: live?.title ?? `PR #${run.prNumber}`,
        author: live?.user?.login ?? null,
        headBranch: live?.head?.ref ?? null,
        baseBranch: live?.base?.ref ?? null,
        additions: live?.additions ?? null,
        deletions: live?.deletions ?? null,
        changedFiles: live?.changed_files ?? null,
        status: live == null ? 'unknown' : live.merged ? 'merged' : live.state === 'closed' ? 'closed' : 'open',
        humanPrReview: reviewByRunId.get(run.id) ?? null,
        runId: run.id,
        createdAt: run.createdAt,
      });
    }
  }

  prs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return c.json({ prs: prs.slice(0, 100) });
});

/**
 * GET /api/issues-prs/prs/:id/detail — the full PR description + what guardian actually said.
 * Lazily loaded when a PR drawer opens (like issue comments) so the list stays fast. The PR body
 * and guardian's review are fetched LIVE from GitHub — the real source of truth — so this works
 * for old rows created before we captured the review body locally. :id is the same encoded id
 * the list returns: "autofix-<approvalId>" or "human-<runId>".
 */
issuesPrsRouter.get('/prs/:id/detail', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const id = c.req.param('id');
  const m = id.match(/^(autofix|human)-(\d+)$/);
  if (!m) return c.json({ error: 'Invalid PR id' }, 400);
  const [, kind, rawNum] = m;
  const rowId = Number(rawNum);

  // Resolve repoId + pullRequestNumber from the right table for this kind.
  let repoId: number | null = null;
  let pullNumber: number | null = null;
  if (kind === 'autofix') {
    const [a] = await db.select().from(schema.mergeApprovals).where(eq(schema.mergeApprovals.id, rowId));
    if (a) { repoId = a.repoId; pullNumber = a.pullRequestNumber; }
  } else {
    const [run] = await db.select().from(schema.runs).where(eq(schema.runs.id, rowId));
    if (run) { repoId = run.repoId; pullNumber = run.prNumber; }
  }
  if (repoId == null || pullNumber == null) return c.json({ error: 'PR not found' }, 404);

  const repos = await accessibleRepos(session.user.id);
  if (!repos.some((r) => r.id === repoId)) return c.json({ error: 'Forbidden' }, 403);

  const ctx = await resolveOctokit(String(repoId));
  if ('error' in ctx) return c.json({ error: ctx.error }, 502);

  try {
    const prRes: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner: ctx.owner, repo: ctx.repo, pull_number: pullNumber,
    });
    // Real reviews on the PR — guardian's formal review lives here when GitHub allowed it.
    const reviewsRes: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
      owner: ctx.owner, repo: ctx.repo, pull_number: pullNumber,
    });
    // Guardian may have fallen back to an issue comment ("can't review own PR") — include those
    // that are clearly its assessment so the "what did guardian say" is never empty when it spoke.
    const commentsRes: any = await ctx.octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: ctx.owner, repo: ctx.repo, issue_number: pullNumber,
    });
    const guardianComments = (commentsRes.data ?? [])
      .filter((cm: any) => /guardian assessment/i.test(cm.body ?? ''))
      .map((cm: any) => ({ author: cm.user?.login, body: cm.body, event: 'COMMENT', createdAt: cm.created_at, htmlUrl: cm.html_url, viaComment: true }));

    const reviews = (reviewsRes.data ?? [])
      .filter((rv: any) => (rv.body && rv.body.trim()) || rv.state !== 'COMMENTED')
      .map((rv: any) => ({ author: rv.user?.login, body: rv.body ?? '', event: rv.state, createdAt: rv.submitted_at, htmlUrl: rv.html_url, viaComment: false }));

    const guardianReview = [...reviews, ...guardianComments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return c.json({
      body: prRes.data.body ?? '',
      headBranch: prRes.data.head?.ref ?? null,
      baseBranch: prRes.data.base?.ref ?? null,
      additions: prRes.data.additions ?? null,
      deletions: prRes.data.deletions ?? null,
      changedFiles: prRes.data.changed_files ?? null,
      author: prRes.data.user?.login ?? null,
      guardianReview,
    });
  } catch (e: any) {
    if (e?.status === 404) return c.json({ error: 'This pull request no longer exists on GitHub.' }, 404);
    return c.json({ error: `Real GitHub PR detail fetch failed: ${e.message}` }, 502);
  }
});
