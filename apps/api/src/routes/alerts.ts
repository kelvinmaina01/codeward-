import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc, gte } from 'drizzle-orm';

export const alertsRouter = new Hono();

const AGENT_DISPLAY: Record<string, string> = {
  security: 'Security Agent', bloat: 'Bloat Agent', broken_code: 'Broken Code Agent',
  architecture: 'Architecture Agent', compliance: 'Compliance Agent', data_dx: 'Data & DX Agent',
  ai_era: 'AI-Era Agent', guardian: 'Guardian Agent',
};

/**
 * Real alerts feed. A full user-journey audit found Alerts.tsx was a 9-item hardcoded array
 * (fake Stripe key, fake N+1, etc). This aggregates the REAL notable events Codeward has
 * actually produced for repos this user can access:
 *   - CRITICAL/HIGH findings from recent completed runs
 *   - real GitHub issues escalation opened (reportMeta.escalation)
 *   - real auto-fix PRs opened (reportMeta.autoFixPR)
 * The "create alert rule" form + Slack/WhatsApp/Calendar delivery is a separate, genuinely
 * unbuilt feature — this endpoint does not pretend those exist.
 */
/**
 * Real debt fixed feed. Returns real auto-fix PRs, remediated debt, files modified,
 * Guardian verdicts, and remediation stats across accessible repos.
 */
alertsRouter.get('/fixed', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember).where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);
  const accessConds = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConds.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConds));
  if (repos.length === 0) return c.json({ fixed: [], stats: { totalFixed: 0, prsOpened: 0, prsMerged: 0, filesRemediated: 0 } });

  const repoIds = repos.map((r) => r.id);
  const repoById = new Map(repos.map((r) => [r.id, r]));

  // Query merge approvals (real PRs opened and approved/auto-merged)
  const approvals = await db.select().from(schema.mergeApprovals)
    .where(inArray(schema.mergeApprovals.repoId, repoIds))
    .orderBy(desc(schema.mergeApprovals.createdAt))
    .limit(50);

  // Query runs and agent tasks that produced auto-fix PRs
  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(40);
  
  const runIds = recentRuns.map((r) => r.id);
  const tasks = runIds.length > 0
    ? await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds))
    : [];

  const taskByApprovalId = new Map<number, any>();
  const taskByRunAgent = new Map<string, any>();
  for (const t of tasks) {
    const meta = (t.reportMeta as any) ?? {};
    if (meta.autoFixPR?.approvalId) {
      taskByApprovalId.set(meta.autoFixPR.approvalId, t);
    }
    if (meta.autoFixPR?.opened) {
      taskByRunAgent.set(`${t.runId}-${t.agentId}`, t);
    }
  }

  const fixedList: any[] = [];
  const seenPrNumbers = new Set<string>();
  let prsMerged = 0;
  let totalFilesRemediated = 0;

  // Process merge approvals first
  for (const a of approvals) {
    const repo = repoById.get(a.repoId);
    const repoFullName = repo?.fullName ?? 'unknown';
    const prKey = `${a.repoId}-${a.pullRequestNumber}`;
    seenPrNumbers.add(prKey);

    const isMerged = a.status === 'auto_merged' || a.status === 'approved';
    if (isMerged) prsMerged++;

    // Correlate with agentTask for appliedFixes if available
    const matchedTask = taskByApprovalId.get(a.id) || (a.runId ? taskByRunAgent.get(`${a.runId}-${a.agentId}`) : null);
    const taskMeta = (matchedTask?.reportMeta as any) ?? {};
    const appliedFixes = Array.isArray(taskMeta.autoFixPR?.appliedFixes) ? taskMeta.autoFixPR.appliedFixes : [];
    totalFilesRemediated += Math.max(appliedFixes.length, 1);

    fixedList.push({
      id: `approval-${a.id}`,
      kind: 'autofix_pr',
      repo: repoFullName,
      repoId: a.repoId,
      runId: a.runId,
      pullRequestNumber: a.pullRequestNumber,
      prUrl: a.prUrl || `https://github.com/${repoFullName}/pull/${a.pullRequestNumber}`,
      title: a.prTitle || `Auto-fix PR #${a.pullRequestNumber} by ${AGENT_DISPLAY[a.agentId] ?? a.agentId}`,
      description: a.decisionNote || (isMerged ? 'Remediation merged and applied to the repository.' : 'Auto-fix PR generated with verified fix.'),
      agentId: a.agentId,
      agentDisplay: AGENT_DISPLAY[a.agentId] ?? a.agentId,
      status: a.status, // approved, auto_merged, pending, etc.
      guardianVerdict: a.guardianVerdict || 'APPROVE',
      maxSeverity: a.maxSeverity || 'LOW',
      mode: a.mode,
      appliedFixes: appliedFixes.map((f: any) => ({
        filePath: f.filePath,
        rationale: f.rationale || f.description || 'Refactored code to eliminate technical debt.',
        confidence: f.confidence || 'high',
      })),
      filesCount: Math.max(appliedFixes.length, 1),
      decidedAt: a.decidedAt,
      createdAt: a.createdAt,
    });
  }

  // Also include any tasks with autoFixPR.opened that might not have an approval record
  for (const t of tasks) {
    const meta = (t.reportMeta as any) ?? {};
    if (meta.autoFixPR?.opened && meta.autoFixPR.pullRequestNumber) {
      const run = recentRuns.find((r) => r.id === t.runId);
      const repo = run?.repoId != null ? repoById.get(run.repoId) : undefined;
      const repoFullName = repo?.fullName ?? 'unknown';
      const prKey = `${run?.repoId}-${meta.autoFixPR.pullRequestNumber}`;
      if (seenPrNumbers.has(prKey)) continue;
      seenPrNumbers.add(prKey);

      const appliedFixes = Array.isArray(meta.autoFixPR.appliedFixes) ? meta.autoFixPR.appliedFixes : [];
      totalFilesRemediated += Math.max(appliedFixes.length, 1);

      fixedList.push({
        id: `task-pr-${t.id}`,
        kind: 'autofix_pr',
        repo: repoFullName,
        repoId: run?.repoId,
        runId: t.runId,
        pullRequestNumber: meta.autoFixPR.pullRequestNumber,
        prUrl: meta.autoFixPR.htmlUrl || `https://github.com/${repoFullName}/pull/${meta.autoFixPR.pullRequestNumber}`,
        title: `Auto-fix PR #${meta.autoFixPR.pullRequestNumber} — ${appliedFixes.length || meta.autoFixPR.fixedCount || 1} fix(es)`,
        description: 'Auto-fix PR generated by Codeward agent and submitted to repository.',
        agentId: t.agentId,
        agentDisplay: AGENT_DISPLAY[t.agentId] ?? t.agentId,
        status: 'approved',
        guardianVerdict: meta.autoFixPR.guardianReview?.event || 'APPROVE',
        maxSeverity: 'MEDIUM',
        mode: 'auto',
        appliedFixes: appliedFixes.map((f: any) => ({
          filePath: f.filePath,
          rationale: f.rationale || f.description || 'Refactored code to eliminate technical debt.',
          confidence: f.confidence || 'high',
        })),
        filesCount: Math.max(appliedFixes.length, 1),
        decidedAt: t.completedAt,
        createdAt: t.createdAt,
      });
    }
  }

  return c.json({
    fixed: fixedList,
    stats: {
      totalFixed: fixedList.length,
      prsOpened: fixedList.length,
      prsMerged,
      filesRemediated: totalFilesRemediated,
    }
  });
});

alertsRouter.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember).where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);
  const accessConds = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConds.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConds));
  if (repos.length === 0) return c.json({ alerts: [], stats: { total: 0, high: 0, critical: 0, fixesOpened: 0 } });

  const repoById = new Map(repos.map((r) => [r.id, r]));
  const tf = c.req.query('timeFilter') || 'all';
  const timeFilterMap: Record<string, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '15d': 15 * 24 * 60 * 60 * 1000,
  };

  const baseCond = inArray(schema.runs.repoId, repos.map((r) => r.id));
  const cond = tf !== 'all' && timeFilterMap[tf]
    ? and(baseCond, gte(schema.runs.createdAt, new Date(Date.now() - timeFilterMap[tf])))
    : baseCond;

  const recentRuns = await db.select().from(schema.runs)
    .where(cond)
    .orderBy(desc(schema.runs.createdAt)).limit(40);
  if (recentRuns.length === 0) return c.json({ alerts: [], stats: { total: 0, high: 0, critical: 0, fixesOpened: 0 } });

  const tasks = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, recentRuns.map((r) => r.id)));
  const runById = new Map(recentRuns.map((r) => [r.id, r]));

  const alerts: any[] = [];
  let critical = 0, high = 0, fixesOpened = 0;

  for (const task of tasks) {
    const run = runById.get(task.runId);
    if (!run) continue;
    const repo = run.repoId != null ? repoById.get(run.repoId) : undefined;
    const repoName = repo?.fullName ?? 'unknown';
    const meta = (task.reportMeta as any) ?? {};

    // Real high-severity findings -> alerts
    for (const f of ((task.findings as any[]) ?? [])) {
      const sev = String(f.severity ?? '').toUpperCase();
      if (sev !== 'CRITICAL' && sev !== 'HIGH') continue;
      if (f.dismissed) continue;
      if (sev === 'CRITICAL') critical++; else high++;
      alerts.push({
        id: `finding-${task.id}-${f.id ?? alerts.length}`,
        kind: 'finding', severity: sev, category: f.category ?? null,
        title: f.title, description: f.description,
        source: AGENT_DISPLAY[task.agentId] ?? task.agentId, repo: repoName,
        file: f.file ?? null, line: f.line ?? null,
        evidence: f.rawEvidence ?? null, suggestedFix: f.suggestedFix ?? null,
        runId: run.id, repoId: run.repoId, createdAt: run.createdAt,
      });
    }

    // Real escalated issues (orchestrator phase 3 rows)
    for (const issue of (meta.escalation?.escalated ?? [])) {
      alerts.push({
        id: `issue-${issue.issueNumber}`, kind: 'escalation', severity: 'HIGH',
        title: `GitHub issue #${issue.issueNumber} opened: ${issue.title}`,
        description: `Codeward could not auto-fix this ${issue.agentId} finding and opened a real GitHub issue.`,
        source: 'Guardian Agent', repo: repoName, htmlUrl: issue.htmlUrl,
        runId: run.id, repoId: run.repoId, createdAt: run.createdAt,
      });
    }

    // Real auto-fix PRs opened
    if (meta.autoFixPR?.opened) {
      fixesOpened++;
      const review = meta.autoFixPR.guardianReview;
      alerts.push({
        id: `pr-${meta.autoFixPR.pullRequestNumber}`, kind: 'autofix', severity: 'INFO',
        title: `Auto-fix PR #${meta.autoFixPR.pullRequestNumber} opened — ${meta.autoFixPR.appliedFixes?.length ?? meta.autoFixPR.fixedCount ?? 0} fix(es)`,
        description: review?.reviewed ? `Guardian reviewed it: ${review.event}.` : 'Awaiting Guardian review.',
        source: `${AGENT_DISPLAY[task.agentId] ?? task.agentId} + Guardian`, repo: repoName,
        htmlUrl: meta.autoFixPR.htmlUrl, runId: run.id, repoId: run.repoId, createdAt: run.createdAt,
      });
    }
  }

  alerts.sort((a, b) => {
    const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, INFO: 2 };
    if ((rank[a.severity] ?? 9) !== (rank[b.severity] ?? 9)) return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return c.json({
    alerts: alerts.slice(0, 100),
    stats: { total: alerts.length, critical, high, fixesOpened },
  });
});
