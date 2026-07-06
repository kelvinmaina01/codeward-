import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';

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
  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repos.map((r) => r.id)))
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
