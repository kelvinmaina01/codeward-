import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { executeMerge, rejectApproval, readMergeSettings, DEFAULT_MERGE_SETTINGS } from '../agents/merge/merge.service.js';
import { mergeQueue } from '../agents/merge/merge.queue.js';

export const approvalsRouter = new Hono();

/** Same real ownership rule as the reports routes: direct owner or org member. */
async function userCanAccessRepo(userId: string, repoId: number): Promise<boolean> {
  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return false;
  if (repo.userId === userId) return true;
  if (repo.orgId == null) return false;
  const [membership] = await db.select().from(schema.organizationMember)
    .where(and(eq(schema.organizationMember.userId, userId), eq(schema.organizationMember.orgId, repo.orgId)));
  return !!membership;
}

async function accessibleRepoIds(userId: string): Promise<number[]> {
  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, userId));
  const orgIds = userOrgs.map((o) => o.orgId);
  const conditions = [eq(schema.repositories.userId, userId)];
  if (orgIds.length > 0) conditions.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select({ id: schema.repositories.id }).from(schema.repositories).where(or(...conditions));
  return repos.map((r) => r.id);
}

/** GET /api/approvals — this user's pending merge approvals, newest first. */
approvalsRouter.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoIds = await accessibleRepoIds(session.user.id);
  if (repoIds.length === 0) return c.json({ approvals: [] });

  const statusFilter = c.req.query('status') ?? 'pending';
  const conditions = [inArray(schema.mergeApprovals.repoId, repoIds)];
  if (statusFilter !== 'all') conditions.push(eq(schema.mergeApprovals.status, statusFilter));

  const rows = await db.select().from(schema.mergeApprovals)
    .where(and(...conditions))
    .orderBy(desc(schema.mergeApprovals.createdAt))
    .limit(50);

  const repoById = new Map(
    (await db.select().from(schema.repositories).where(inArray(schema.repositories.id, repoIds))).map((r) => [r.id, r.fullName])
  );

  return c.json({
    approvals: rows.map((r) => ({
      id: r.id,
      repoId: r.repoId,
      repoFullName: repoById.get(r.repoId) ?? 'unknown',
      runId: r.runId,
      agentId: r.agentId,
      pullRequestNumber: r.pullRequestNumber,
      prUrl: r.prUrl,
      prTitle: r.prTitle,
      guardianVerdict: r.guardianVerdict,
      maxSeverity: r.maxSeverity,
      mode: r.mode,
      deadlineAt: r.deadlineAt,
      status: r.status,
      createdAt: r.createdAt,
    })),
  });
});

/** POST /api/approvals/:id/approve — merge the PR right now, with this user's real authorization. */
approvalsRouter.post('/:id/approve', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const approvalId = Number(c.req.param('id'));
  if (!Number.isFinite(approvalId)) return c.json({ error: 'Invalid approval id' }, 400);

  const [approval] = await db.select().from(schema.mergeApprovals).where(eq(schema.mergeApprovals.id, approvalId));
  if (!approval) return c.json({ error: 'Approval not found' }, 404);
  if (!(await userCanAccessRepo(session.user.id, approval.repoId))) return c.json({ error: 'Forbidden' }, 403);

  const outcome = await executeMerge(approvalId, session.user.id);
  if (!outcome.merged) return c.json({ merged: false, error: outcome.reason }, 409);

  // A pending timeout job for this approval is now moot — remove it so it can't fire.
  try { await mergeQueue.remove(`merge-approval-${approvalId}`); } catch { /* best-effort; the worker's pending-status re-check is the real guard */ }

  return c.json({ merged: true, sha: outcome.sha });
});

/** POST /api/approvals/:id/reject — close the PR with a real explanatory comment. */
approvalsRouter.post('/:id/reject', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const approvalId = Number(c.req.param('id'));
  if (!Number.isFinite(approvalId)) return c.json({ error: 'Invalid approval id' }, 400);

  const [approval] = await db.select().from(schema.mergeApprovals).where(eq(schema.mergeApprovals.id, approvalId));
  if (!approval) return c.json({ error: 'Approval not found' }, 404);
  if (!(await userCanAccessRepo(session.user.id, approval.repoId))) return c.json({ error: 'Forbidden' }, 403);

  let note: string | undefined;
  try { note = (await c.req.json())?.note; } catch { /* empty body is fine */ }

  const outcome = await rejectApproval(approvalId, session.user.id, note);
  if (!outcome.rejected) return c.json({ rejected: false, error: outcome.reason }, 409);

  try { await mergeQueue.remove(`merge-approval-${approvalId}`); } catch { /* best-effort */ }

  return c.json({ rejected: true });
});

/** GET /api/approvals/settings/:repoId — the repo's real persisted merge settings. */
approvalsRouter.get('/settings/:repoId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  return c.json({ settings: readMergeSettings(repo?.config) });
});

/** PUT /api/approvals/settings/:repoId — persist merge mode + timeout into repositories.config. */
approvalsRouter.put('/settings/:repoId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const mode = body?.mode === 'auto' ? 'auto' : body?.mode === 'manual' ? 'manual' : null;
  if (!mode) return c.json({ error: "mode must be 'manual' or 'auto'" }, 400);
  const timeoutMinutes = Number(body?.timeoutMinutes);
  const settings = {
    mode,
    timeoutMinutes: Number.isFinite(timeoutMinutes) && timeoutMinutes >= 1 ? Math.min(timeoutMinutes, 7 * 24 * 60) : DEFAULT_MERGE_SETTINGS.timeoutMinutes,
  };

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  const newConfig = { ...((repo?.config as object) ?? {}), merge: settings };
  await db.update(schema.repositories).set({ config: newConfig }).where(eq(schema.repositories.id, repoId));

  return c.json({ settings });
});
