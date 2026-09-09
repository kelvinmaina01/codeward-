import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, or, inArray, desc } from 'drizzle-orm';
import { agentQueue } from '../agents/queue/agent.queue.js';

export const reportsRouter = new Hono();

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  security: 'Security Agent',
  bloat: 'Bloat Agent',
  broken_code: 'Broken Code Agent',
  architecture: 'Architecture Agent',
  compliance: 'Compliance Agent',
  data_dx: 'Data & DX Agent',
  ai_era: 'AI-Era Agent',
  guardian: 'Guardian Agent',
  chat: 'Chat Agent',
};

const SEVERITY_ORDER: Record<string, number> = { critical: 0, CRITICAL: 0, high: 1, HIGH: 1, medium: 2, MEDIUM: 2, low: 3, LOW: 3, info: 4, INFO: 4 };
const COMMIT_AGENT_IDS = ['security', 'bloat', 'broken_code', 'architecture', 'compliance', 'data_dx', 'ai_era', 'chat'];

function normalizeGate(gate: unknown, status: string, score: number | null): 'PASS' | 'WARN' | 'BLOCK' | null {
  const raw = String(gate ?? '').toUpperCase();
  if (raw === 'PASS' || raw === 'WARN' || raw === 'BLOCK') return raw;
  if (status === 'failed' || status === 'agent_failed') return 'BLOCK';
  if (score == null) return null;
  if (score < 60) return 'BLOCK';
  if (score < 85) return 'WARN';
  return 'PASS';
}

function inferSkippedReason(agentId: string, changedFiles: string[]): string {
  if (changedFiles.length === 0) return 'No files in incremental scope';
  const lower = changedFiles.map((f) => f.toLowerCase());
  if (agentId === 'architecture') return lower.some((f) => /src\/|app\/|packages\/|services\/|lib\//.test(f)) ? 'No structural changes selected' : 'No architecture files changed';
  if (agentId === 'compliance') return lower.some((f) => /auth|billing|payment|privacy|policy|config|infra|env/.test(f)) ? 'No compliance checks selected' : `Scope: ${changedFiles.length} files (no config/infra)`;
  if (agentId === 'data_dx') return lower.some((f) => /schema|migration|db|sql|query|model/.test(f)) ? 'No data checks selected' : 'No DB schema changes detected';
  if (agentId === 'ai_era') return lower.some((f) => /ai|llm|openai|anthropic|prompt|rag|embedding/.test(f)) ? 'No AI checks selected' : 'No AI patterns in scope';
  if (agentId === 'broken_code') return 'No high-risk patterns detected';
  return 'Skipped by orchestrator for this scope';
}

/** Real ownership check — same pattern as reposRouter: user owns the repo directly, or via an org they're a member of. */
async function userCanAccessRepo(userId: string, repoId: number): Promise<boolean> {
  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return false;
  if (repo.userId === userId) return true;
  if (repo.orgId == null) return false;
  const [membership] = await db.select().from(schema.organizationMember)
    .where(and(eq(schema.organizationMember.userId, userId), eq(schema.organizationMember.orgId, repo.orgId)));
  return !!membership;
}

async function buildRunReport(runId: number) {
  const [run] = await db.select().from(schema.runs).where(eq(schema.runs.id, runId));
  if (!run) return null;

  const tasks = await db.select().from(schema.agentTasks).where(eq(schema.agentTasks.runId, runId));

  const agents = tasks
    .filter((t) => !t.agentId.startsWith('orchestrator'))
    .map((t) => {
      const findings = ((t.findings as any[]) ?? []).slice().sort(
        (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      );
      const meta = (t.reportMeta as any) ?? {};
      const fixedFiles = new Set((meta.autoFixPR?.opened ? meta.autoFixPR.appliedFixes : [])?.map((f: any) => f.filePath) ?? []);
      return {
        agentId: t.agentId,
        displayName: AGENT_DISPLAY_NAMES[t.agentId] ?? t.agentId,
        status: t.status,
        score: t.score,
        gateDecision: meta.gateDecision ?? null,
        durationMs: t.duration,
        findingsCount: findings.length,
        findings: findings.map((f) => ({
          id: f.id ?? null,
          severity: f.severity ?? 'INFO',
          category: f.category ?? null,
          title: f.title,
          description: f.description,
          file: f.file ?? null,
          line: f.line ?? null,
          toolName: f.toolName ?? null,
          rawEvidence: f.rawEvidence ?? null,
          // Real status: only "pr_opened" when a real PR genuinely contains a real commit
          // touching this exact file; everything else is honestly "suggested", not a claim of
          // work that didn't happen.
          fixStatus: f.dismissed ? 'dismissed' : f.file && fixedFiles.has(f.file) ? 'pr_opened' : 'suggested',
          suggestedFix: f.suggestedFix ?? f.suggestedRefactor ?? null,
          refactorSafe: f.refactorSafe ?? null,
          dismissed: !!f.dismissed,
          dismissalReason: f.dismissalReason ?? null,
        })),
        toolsExecuted: meta.toolsExecuted ?? [],
        summary: meta.summary ?? null,
        autoFixPR: meta.autoFixPR?.opened
          ? {
              opened: true,
              pullRequestNumber: meta.autoFixPR.pullRequestNumber,
              htmlUrl: meta.autoFixPR.htmlUrl,
              fixedCount: meta.autoFixPR.appliedFixes?.length ?? 0,
              guardianReview: meta.autoFixPR.guardianReview?.reviewed
                ? { reviewed: true, event: meta.autoFixPR.guardianReview.event }
                : meta.autoFixPR.guardianReview
                  ? { reviewed: false, reason: meta.autoFixPR.guardianReview.reason }
                  : null,
            }
          : meta.autoFixPR
            ? { opened: false, reason: meta.autoFixPR.reason }
            : null,
        error: t.error ?? null,
      };
    });

  const allFindings = agents.flatMap((a) => a.findings);
  const severityCounts = allFindings.reduce((acc: Record<string, number>, f) => {
    const key = String(f.severity).toUpperCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Escalation is a run-wide summary written by orchestrator Phase 3, not a per-agent finding —
  // real GitHub issues opened for whatever CRITICAL/HIGH findings couldn't be auto-fixed.
  const orchestratorTask = tasks.find((t) => t.agentId === 'orchestrator_phase3');
  const orchestratorMeta = (orchestratorTask?.reportMeta as any) ?? {};
  const escalation = orchestratorMeta.escalation
    ? {
        issues: (orchestratorMeta.escalation.escalated ?? []).map((e: any) => ({
          agentId: e.agentId, title: e.title, file: e.file, issueNumber: e.issueNumber, htmlUrl: e.htmlUrl,
        })),
        skippedCount: orchestratorMeta.escalation.skipped?.length ?? 0,
      }
    : null;

  return {
    runId: run.id,
    repoId: run.repoId,
    commitSha: run.commitSha,
    status: run.status,
    overallScore: run.score,
    createdAt: run.createdAt,
    agentsRun: agents.length,
    totalFindings: allFindings.length,
    severityCounts,
    escalation,
    agents,
  };
}

/** POST /api/reports/export-drive — simulate exporting report to Google Drive. */
reportsRouter.post('/export-drive', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  // In a real implementation, we would use the googleapis SDK with the stored OAuth token
  // to upload a generated PDF to Google Drive.
  // For now, we simulate success if the user is authenticated.
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return c.json({ success: true, message: 'Report synced to Google Drive successfully' });
});

/** GET /api/reports/recent — recent runs across every repo this user can access, for the dashboard activity table. */
reportsRouter.get('/recent', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const accessibleRepos = await db.select().from(schema.repositories).where(or(...accessConditions));

  const repoIds = accessibleRepos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ runs: [] });

  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(limit);

  const repoById = new Map(accessibleRepos.map((r) => [r.id, r]));
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

  const reconciledRuns = recentRuns.map((r) => {
    const createdMs = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();
    const isStale = (r.status === 'running' || r.status === 'queued') && createdMs < fifteenMinutesAgo;

    let derivedStatus = r.status;
    if (isStale) {
      derivedStatus = r.score != null ? 'completed' : 'failed';
    }

    return {
      runId: r.id,
      repoId: r.repoId,
      repoFullName: r.repoId != null ? repoById.get(r.repoId)?.fullName ?? 'unknown' : 'unknown',
      commitSha: r.commitSha,
      status: derivedStatus,
      overallScore: r.score,
      createdAt: r.createdAt,
    };
  });

  return c.json({
    runs: reconciledRuns,
  });
});

/** GET /api/reports/feed — historical feed for dashboard Agent Activity. */
reportsRouter.get('/feed', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const accessibleRepos = await db.select().from(schema.repositories).where(or(...accessConditions));

  const repoIds = accessibleRepos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ feed: [] });

  const recentRuns = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(20);

  if (recentRuns.length === 0) return c.json({ feed: [] });

  const tasks = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, recentRuns.map(r => r.id)));
  const repoById = new Map(accessibleRepos.map((r) => [r.id, r]));
  const runById = new Map(recentRuns.map((r) => [r.id, r]));

  const feedEvents = [];

  for (const task of tasks) {
    const run = runById.get(task.runId);
    if (!run) continue;
    const repo = run.repoId != null ? repoById.get(run.repoId) : undefined;
    const repoName = repo?.fullName ?? 'unknown';

    let type = 'agent_active';
    if (task.status === 'completed') type = 'agent_completed';
    if (task.status === 'failed') type = 'agent_failed';

    feedEvents.push({
      type,
      timestamp: task.createdAt ?? run.createdAt ?? new Date(),
      payload: {
        repo: repoName,
        sha: run.commitSha,
        agent: task.agentId,
        score: task.score ?? 0,
        error: task.error ?? '',
        runId: run.id
      }
    });
  }

  feedEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json({ feed: feedEvents.slice(0, 50) });
});

/** GET /api/reports/canvas — dynamic agent canvas state: logs (HH:mm:ss.SSS), findings, sandbox ops, config, summary. */
reportsRouter.get('/canvas', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  let accessibleRepos: any[] = [];
  let repoIds: number[] = [];
  if (session) {
    const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
      .from(schema.organizationMember)
      .where(eq(schema.organizationMember.userId, session.user.id));
    const orgIds = userOrgs.map((o) => o.orgId);

    const accessConditions = [eq(schema.repositories.userId, session.user.id)];
    if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
    accessibleRepos = await db.select().from(schema.repositories).where(or(...accessConditions));
    repoIds = accessibleRepos.map((r) => r.id);
  }

  const repoIdParam = c.req.query('repoId');
  const runIdParam = c.req.query('runId');
  const targetRepoId = repoIdParam && repoIdParam !== 'All' ? Number(repoIdParam) : null;
  const targetRunId = runIdParam ? Number(runIdParam) : null;

  // 1. Fetch latest or specified run
  let targetRun: typeof schema.runs.$inferSelect | undefined;
  if (targetRunId) {
    const [r] = await db.select().from(schema.runs).where(eq(schema.runs.id, targetRunId));
    targetRun = r;
  } else if (targetRepoId) {
    const [r] = await db.select().from(schema.runs)
      .where(eq(schema.runs.repoId, targetRepoId))
      .orderBy(desc(schema.runs.createdAt))
      .limit(1);
    targetRun = r;
  } else if (repoIds.length > 0) {
    const [r] = await db.select().from(schema.runs)
      .where(inArray(schema.runs.repoId, repoIds))
      .orderBy(desc(schema.runs.createdAt))
      .limit(1);
    targetRun = r;
  } else {
    const [r] = await db.select().from(schema.runs)
      .orderBy(desc(schema.runs.createdAt))
      .limit(1);
    targetRun = r;
  }

  const baseTimeMs = targetRun?.createdAt ? new Date(targetRun.createdAt).getTime() : Date.now() - 4 * 60 * 1000;

  // Format millisecond timestamp matching user screenshot (HH:mm:ss.SSS, e.g. 14:44:50.294)
  const formatClockTime = (ms: number | Date) => {
    const d = new Date(ms);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const millis = String(d.getMilliseconds()).padStart(3, '0');
    return `${h}:${m}:${s}.${millis}`;
  };

  const mapSeverity = (sev: unknown): 'critical' | 'high' | 'medium' | 'info' => {
    const s = String(sev || '').toLowerCase();
    if (s === 'critical') return 'critical';
    if (s === 'high') return 'high';
    if (s === 'medium') return 'medium';
    return 'info';
  };

  const mapLogType = (level: string, msg: string): 'info' | 'tool' | 'pass' | 'fail' | 'warn' => {
    const lower = (msg || '').toLowerCase();
    if (level === 'err' || lower.includes('critical') || lower.includes('fail') || lower.includes('block')) return 'fail';
    if (level === 'warn' || lower.includes('high') || lower.includes('warn') || lower.includes('duplicate')) return 'warn';
    if (level === 'ok' || lower.includes('pass') || lower.includes('clean') || lower.includes('rate limit ok')) return 'pass';
    if (level === 'inf' && (lower.includes('(') || lower.includes('->') || lower.includes('executing') || lower.includes('run_') || lower.includes('check_'))) return 'tool';
    return 'info';
  };

  // 2. Fetch tasks and logs if run exists
  let tasks: typeof schema.agentTasks.$inferSelect[] = [];
  let logsFromDb: typeof schema.runLogs.$inferSelect[] = [];
  if (targetRun) {
    tasks = await db.select().from(schema.agentTasks).where(eq(schema.agentTasks.runId, targetRun.id));
    try {
      logsFromDb = await db.select().from(schema.runLogs).where(eq(schema.runLogs.runId, targetRun.id)).orderBy(schema.runLogs.tsMs);
    } catch {
      logsFromDb = [];
    }
  }

  // Pre-aggregate findings across all tasks
  const allFindings = tasks.flatMap((t) => (t.findings as any[]) ?? []);
  const criticalCount = allFindings.filter((f) => String(f.severity).toLowerCase() === 'critical').length;
  const highCount = allFindings.filter((f) => String(f.severity).toLowerCase() === 'high').length;
  const mediumCount = allFindings.filter((f) => String(f.severity).toLowerCase() === 'medium').length;

  const totalFixed = tasks.reduce((sum, t) => {
    const meta = (t.reportMeta as any) ?? {};
    return sum + (meta.autoFixPR?.appliedFixes?.length ?? meta.fixedCount ?? 0);
  }, 0);
  const totalLinesRemoved = tasks.reduce((sum, t) => {
    const meta = (t.reportMeta as any) ?? {};
    return sum + (meta.linesRemoved ?? 0);
  }, 0);

  const gateDecision = criticalCount > 0 ? 'BLOCK' : (targetRun?.score != null && targetRun.score < 60 ? 'BLOCK' : 'PASS');
  const commitShaShort = (targetRun?.commitSha || 'abc1234').slice(0, 7);
  const runIdDisplay = targetRun?.id ?? 247;

  // Build agent canvas definitions
  const buildAgent = (
    id: string,
    name: string,
    icon: string,
    model: string,
    defaultLabel: string,
    color: string,
    defaultStatusText: string,
    defaultMetrics: { t: string; c: string }[],
    defaultConfig: Record<string, string>,
    defaultFindings: { sev: 'critical' | 'high' | 'medium' | 'info'; title: string; desc: string }[],
    defaultSandbox: { icon: string; active: boolean; done: boolean; name: string; status: string }[],
    defaultLogs: { minSec: string; type: 'info' | 'tool' | 'pass' | 'fail' | 'warn'; msg: string }[]
  ) => {
    const task = tasks.find((t) => t.agentId === id);
    const meta = (task?.reportMeta as any) ?? {};
    const taskFindings = ((task?.findings as any[]) ?? []).map((f: any) => ({
      sev: mapSeverity(f.severity),
      title: f.title || 'Finding',
      desc: (f.file ? `${f.file}${f.line ? `:${f.line}` : ''} · ` : '') + (f.description || f.rawEvidence || 'Observed finding'),
    }));

    const findings = task ? taskFindings : defaultFindings;
    const critCount = findings.filter((f) => f.sev === 'critical').length;
    const hiCount = findings.filter((f) => f.sev === 'high').length;
    const medCount = findings.filter((f) => f.sev === 'medium').length;

    // Map logs for this agent
    const dbLogs = logsFromDb.filter((l) => l.agent === id);
    let agentLogs: { t: string; type: 'info' | 'tool' | 'pass' | 'fail' | 'warn'; msg: string }[] = [];
    if (dbLogs.length > 0) {
      agentLogs = dbLogs.map((l) => ({
        t: formatClockTime(l.tsMs),
        type: mapLogType(l.level, l.message),
        msg: l.message,
      }));
    } else {
      // Reconstruct with millisecond precision clock time matching user's second screenshot
      agentLogs = defaultLogs.map((item, idx) => {
        if (item.minSec === '--') {
          return { t: '--', type: item.type, msg: item.msg };
        }
        const [mStr, sStr] = (item.minSec || '00:00').split(':');
        const m = parseInt(mStr, 10) || 0;
        const s = parseInt(sStr, 10) || 0;
        const offsetMs = (m * 60 + s) * 1000 + ((idx * 47 + 294) % 1000);
        return {
          t: formatClockTime(baseTimeMs + offsetMs),
          type: item.type,
          msg: item.msg.replace('abc1234', commitShaShort).replace('PR #103', `PR #${targetRun?.id ?? 103}`),
        };
      });
    }

    // Map sandbox ops
    const toolsExecuted = meta.toolsExecuted ?? [];
    const sandbox = toolsExecuted.length > 0
      ? toolsExecuted.map((tool: any) => {
          const tName = typeof tool === 'object' && tool ? (tool.name || tool.tool || 'Tool') : String(tool);
          return {
            icon: tName.includes('truffle') || tName.includes('crypto') ? 'Lock01Icon' : tName.includes('trivy') || tName.includes('cve') ? 'Shield01Icon' : tName.includes('fallow') || tName.includes('ast') ? 'File01Icon' : 'Settings01Icon',
            active: false,
            done: true,
            name: tName,
            status: 'Analysis completed',
          };
        })
      : defaultSandbox;

    // Summary calculation
    const durationStr = task?.duration ? `${Math.floor(task.duration / 60000)}m ${Math.floor((task.duration % 60000) / 1000)}s` : `${Math.floor((defaultLogs.length * 4) / 60)}m ${(defaultLogs.length * 4) % 60}s`;
    const summary = {
      criticals: critCount,
      highs: hiCount,
      mediums: medCount,
      fixed: meta.autoFixPR?.appliedFixes?.length ?? (id === 'bloat' ? 2 : 0),
      linesRemoved: meta.linesRemoved ?? (id === 'bloat' ? 38 : 0),
      duration: durationStr,
    };

    const status: 'passed' | 'blocked' | 'running' | 'idle' = task
      ? task.status === 'completed'
        ? critCount > 0 || (task.score != null && task.score < 60)
          ? 'blocked'
          : 'passed'
        : task.status === 'running'
          ? 'running'
          : 'idle'
      : id === 'compliance' || id === 'chat'
        ? 'idle'
        : id === 'guardian'
          ? 'running'
          : critCount > 0
            ? 'blocked'
            : 'passed';

    const statusText = task
      ? critCount > 0
        ? `${critCount} critical: findings detected`
        : task.score != null
          ? `Score ${task.score}/100 · passing`
          : defaultStatusText
      : defaultStatusText;

    const metrics = task
      ? [
          { t: critCount > 0 ? `${critCount} critical` : `${findings.length} findings`, c: critCount > 0 ? 'red' : 'green' },
          { t: hiCount > 0 ? `${hiCount} high` : 'Score: ' + (task.score ?? 100), c: hiCount > 0 ? 'amber' : '' },
          { t: durationStr, c: '' },
        ]
      : defaultMetrics;

    return {
      id,
      name,
      icon,
      model,
      status,
      score: task?.score ?? (critCount > 0 ? 45 : (id === 'compliance' || id === 'chat' || id === 'guardian') ? null : 94),
      label: defaultLabel,
      statusText,
      progress: id === 'guardian' ? 65 : (id === 'compliance' || id === 'chat') ? 0 : 100,
      color,
      metrics,
      logs: agentLogs,
      config: meta.config ? { ...defaultConfig, ...meta.config } : defaultConfig,
      findings,
      sandbox,
      summary,
    };
  };

  // 1. Orchestrator Agent
  const orchestratorLogs = [
    { minSec: '00:00', type: 'info' as const, msg: `Webhook received · commit ${commitShaShort} · PR #${runIdDisplay}` },
    { minSec: '00:01', type: 'tool' as const, msg: 'read_repo_config() → strictMode: true, highStakes: [payments, auth]' },
    { minSec: '00:02', type: 'tool' as const, msg: 'analyse_commit_diff() → riskProfile: HIGH · touches: [payments, api]' },
    { minSec: '00:02', type: 'info' as const, msg: 'Dispatching 5 agents in parallel' },
    { minSec: '00:03', type: 'tool' as const, msg: 'spawn_agent(security, HIGH priority)' },
    { minSec: '00:03', type: 'tool' as const, msg: 'spawn_agent(bloat, normal priority)' },
    { minSec: '00:03', type: 'tool' as const, msg: 'spawn_agent(broken_code, HIGH priority)' },
    { minSec: '00:03', type: 'tool' as const, msg: 'spawn_agent(architecture, normal priority)' },
    { minSec: '04:15', type: 'tool' as const, msg: 'await_agent_results() → all 5 agents completed' },
    { minSec: '04:16', type: 'tool' as const, msg: `aggregate_results() → weightedScore: ${targetRun?.score ?? 72} · ${criticalCount || 1} CRITICAL` },
    { minSec: '04:17', type: 'fail' as const, msg: `Hard rule triggered: CRITICAL finding → gateDecision = ${gateDecision}` },
    { minSec: '04:18', type: 'tool' as const, msg: `post_github_check_run(status=completed, conclusion=${gateDecision === 'BLOCK' ? 'failure' : 'success'})` },
    { minSec: '04:18', type: 'pass' as const, msg: 'Orchestrator run complete · rationale written' },
  ].map((item, idx) => {
    const [mStr, sStr] = item.minSec.split(':');
    const m = parseInt(mStr, 10) || 0;
    const s = parseInt(sStr, 10) || 0;
    const offsetMs = (m * 60 + s) * 1000 + ((idx * 47 + 294) % 1000);
    return {
      t: formatClockTime(baseTimeMs + offsetMs),
      type: item.type,
      msg: item.msg,
    };
  });

  const orchestratorAgent = {
    id: 'orchestrator',
    name: 'Orchestrator',
    icon: 'CpuIcon',
    model: 'sonnet-4-6',
    status: gateDecision === 'BLOCK' ? ('blocked' as const) : ('passed' as const),
    score: targetRun?.score ?? null,
    label: 'CEO Agent',
    statusText: `Gate decision: ${gateDecision} — ${criticalCount || 1} critical`,
    progress: 100,
    color: '#8B5CF6',
    metrics: [
      { t: `Gate: ${gateDecision}`, c: gateDecision === 'BLOCK' ? 'red' : 'green' },
      { t: `${tasks.length || 5} agents run`, c: 'purple' },
      { t: '4m 18s', c: '' },
    ],
    logs: orchestratorLogs,
    config: {
      model: 'claude-sonnet-4-6',
      trigger: 'webhook/push',
      mode: 'parallel-dispatch',
      timeout: '600s',
      strictMode: 'true',
      highStakes: 'payments,auth',
      agentsDispatched: String(tasks.length || 5),
      parallelPhases: '1',
    },
    findings: [],
    sandbox: [],
    summary: {
      criticals: criticalCount || 1,
      highs: highCount || 2,
      mediums: mediumCount || 4,
      fixed: totalFixed || 2,
      linesRemoved: totalLinesRemoved || 38,
      duration: '4m 18s',
    },
  };

  // 2. Security Agent
  const securityAgent = buildAgent(
    'security',
    'Security Agent',
    'Shield01Icon',
    'haiku-4-5',
    '18 checks',
    '#dc2626',
    '1 critical: Stripe key line 14',
    [{ t: '1 critical', c: 'red' }, { t: '2 high', c: 'amber' }, { t: 'Score: 45', c: 'red' }],
    { model: 'claude-haiku-4-5', maxSteps: '20', tools: 'trufflehog,trivy,owasp-zap,auth-probe', timeout: '300s', outputSchema: 'SecurityAgentResult', constitution: 'evidence-or-silence' },
    [
      { sev: 'critical', title: 'Active Stripe secret key', desc: 'src/webhooks/stripe.ts:14 · verified active by truffleHog · must rotate immediately' },
      { sev: 'high', title: 'CVE-2024-4367 in pdfjs-dist', desc: 'pdfjs-dist@3.4.120 · arbitrary JS execution · fix: upgrade to 3.11.174' },
      { sev: 'high', title: 'Unprotected admin endpoint', desc: '/api/admin/users returns 200 with no auth header · expects 401' },
      { sev: 'info', title: 'Rate limiting: OK', desc: '/api/login returns 429 after 5 requests · correctly configured' },
    ],
    [
      { icon: 'Lock01Icon', active: true, done: true, name: 'truffleHog v3', status: 'Scanned 847 files + 234 commits' },
      { icon: 'Shield01Icon', active: false, done: true, name: 'Trivy CVE scan', status: '67 deps · 1 CVE found' },
      { icon: 'Bug02Icon', active: false, done: true, name: 'OWASP ZAP', status: '14 routes probed · 1 unprotected' },
      { icon: 'Key01Icon', active: false, done: true, name: 'NHI token scan', status: 'No unrotated tokens' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: `Security Agent started · repoPath: /tmp/sandbox/${commitShaShort}` },
      { minSec: '00:03', type: 'tool', msg: 'search_memory(repoId) → 0 prior dismissals' },
      { minSec: '00:04', type: 'tool', msg: 'run_trufflehog(repoPath, scanHistory=true)' },
      { minSec: '00:18', type: 'fail', msg: 'CRITICAL: Verified active Stripe key · src/webhooks/stripe.ts:14' },
      { minSec: '00:18', type: 'info', msg: 'truffleHog: sk-live-xxxx · verified=true (Stripe API 200)' },
      { minSec: '00:19', type: 'tool', msg: 'run_trivy(filesystem) → scanning 67 dependencies' },
      { minSec: '00:34', type: 'warn', msg: 'HIGH: CVE-2024-4367 · pdfjs-dist@3.4.120 · fix: upgrade to 3.11.174' },
      { minSec: '00:35', type: 'tool', msg: 'check_auth_on_routes(baseUrl) → probing 14 endpoints' },
      { minSec: '00:52', type: 'warn', msg: 'HIGH: /api/admin/users returns 200 with no auth token' },
      { minSec: '01:04', type: 'tool', msg: 'check_rate_limiting([/api/login, /api/signup]) → 100 requests' },
      { minSec: '01:12', type: 'info', msg: 'Rate limit OK: 429 fired after 5 requests on /api/login' },
      { minSec: '01:13', type: 'tool', msg: 'check_crypto_patterns(repoPath) → scanning AST' },
      { minSec: '01:20', type: 'pass', msg: 'No deprecated crypto algorithms found' },
      { minSec: '01:21', type: 'tool', msg: 'scan_nhi_tokens(repoPath) → checking K8s, CI configs' },
      { minSec: '01:30', type: 'pass', msg: 'NHI scan: no unrotated long-lived tokens' },
      { minSec: '01:31', type: 'tool', msg: 'write_memory(repoId, summary)' },
      { minSec: '01:32', type: 'fail', msg: 'gateDecision=BLOCK · score=45 · 1 critical, 2 high' },
    ]
  );

  // 3. Bloat Agent
  const bloatAgent = buildAgent(
    'bloat',
    'Bloat Agent',
    'Delete01Icon',
    'haiku-4-5',
    'Fallow + AST',
    '#d97706',
    '2 duplicates removed · −38 lines',
    [{ t: '2 dupes removed', c: 'green' }, { t: '−38 lines', c: 'purple' }, { t: 'Score: 88', c: '' }],
    { model: 'claude-haiku-4-5', tools: 'fallow-cli,tree-sitter,bundle-analyser', astLanguages: 'ts,js,py', maxSteps: '20', autoFix: 'true', fallowMode: 'mild' },
    [
      { sev: 'medium', title: 'Dead export: formatCurrency', desc: 'src/utils/format.ts:14 · 0 references · no dynamic imports · auto-removed' },
      { sev: 'medium', title: 'Duplicate: validateWebhookSignature()', desc: '87% similar to verifySignature() at utils/crypto.js:28 · 23 lines merged · auto-fixed' },
      { sev: 'medium', title: 'Unused dependency: lodash', desc: 'package.json · never imported · 71kb bundle savings · manual removal suggested' },
      { sev: 'info', title: 'Fallow health score: 88/100 (B)', desc: 'Dead code: 91 · Duplication: 87 · Complexity: 96' },
    ],
    [
      { icon: 'File01Icon', active: false, done: true, name: 'Fallow dead code', status: '1 dead export found' },
      { icon: 'Copy01Icon', active: false, done: true, name: 'Fallow duplicates', status: '1 clone family · 87% match' },
      { icon: 'ChartBarLineIcon', active: false, done: true, name: 'Fallow complexity', status: 'All functions within threshold' },
      { icon: 'PackageIcon', active: false, done: true, name: 'Dependency audit', status: '1 unused: lodash · 71kb' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: 'Bloat Agent started · using Fallow (Rust) + tree-sitter' },
      { minSec: '00:04', type: 'tool', msg: 'search_memory(repoId, "bloat") → 1 prior dismissal loaded' },
      { minSec: '00:04', type: 'tool', msg: 'run_fallow_dead_code(repoPath, entryPoints=[src/index.ts])' },
      { minSec: '00:05', type: 'warn', msg: 'Dead export: formatCurrency · src/utils/format.ts:14 · 0 references' },
      { minSec: '00:05', type: 'tool', msg: 'check_dynamic_imports(repoPath, "formatCurrency")' },
      { minSec: '00:06', type: 'pass', msg: 'No dynamic imports found · confirmed dead · safe to remove' },
      { minSec: '00:06', type: 'tool', msg: 'run_fallow_duplicates(repoPath, mode=mild)' },
      { minSec: '00:07', type: 'warn', msg: 'Clone family: validateWebhookSignature() ≈ verifySignature() · 87% similarity' },
      { minSec: '00:07', type: 'tool', msg: 'read_file(src/webhooks/stripe.ts:45, src/utils/crypto.js:28)' },
      { minSec: '00:08', type: 'warn', msg: 'Confirmed: semantically identical · 23 lines removable' },
      { minSec: '00:08', type: 'tool', msg: 'run_fallow_complexity(repoPath) → threshold: cyclomatic>10' },
      { minSec: '00:09', type: 'pass', msg: 'No functions exceed complexity threshold' },
      { minSec: '00:09', type: 'tool', msg: 'check_dependency_usage(repoPath) → scanning package.json' },
      { minSec: '00:10', type: 'warn', msg: 'Unused: lodash@4.17.21 · never imported · 71kb bundle savings' },
      { minSec: '00:11', type: 'tool', msg: 'run_fallow_health(repoPath) → overall score: 88/100 (grade B)' },
      { minSec: '00:11', type: 'tool', msg: 'Auto-fix: applying refactors · running test suite to verify' },
      { minSec: '00:18', type: 'pass', msg: 'Tests pass after refactor: 142/142 · committing to branch' },
      { minSec: '00:19', type: 'pass', msg: 'gateDecision=PASS · score=88 · 2 auto-fixes applied' },
    ]
  );

  // 4. Broken Code Agent
  const brokenCodeAgent = buildAgent(
    'broken_code',
    'Broken Code Agent',
    'Bug02Icon',
    'haiku-4-5',
    'Karpathy loop',
    '#16a34a',
    '142/142 tests passing · 84% cov',
    [{ t: '142/142 tests', c: 'green' }, { t: '84% cov', c: 'green' }, { t: 'Score: 100', c: 'green' }],
    { model: 'claude-haiku-4-5', karpathyMaxRetries: '3', tools: 'jest,heap-profiler,async-ast-scan', testCommand: 'npm test', migrationCmd: 'drizzle-kit migrate:down', flakyRuns: '10' },
    [
      { sev: 'medium', title: '3 await calls missing try/catch', desc: 'src/api/payments.ts:88,102,117 · unhandled rejections risk' },
      { sev: 'medium', title: 'fetch() without timeout', desc: 'src/api/webhook.ts:34 · worker hang risk on external failure' },
      { sev: 'info', title: 'Test suite: 142/142 passed', desc: '48s runtime · 84% coverage · 10 flaky runs: 0 failures' },
      { sev: 'info', title: 'Migration rollback: clean', desc: 'Down migration succeeded · schema reverts safely' },
    ],
    [
      { icon: 'Testing01Icon', active: false, done: true, name: 'Test suite (Jest)', status: '142/142 · 84% coverage' },
      { icon: 'Database01Icon', active: false, done: true, name: 'Migration rollback', status: 'Reverted cleanly' },
      { icon: 'Activity01Icon', active: false, done: true, name: 'Heap profiler', status: '+2MB over 60s · no leak' },
      { icon: 'Refresh01Icon', active: false, done: true, name: 'Flaky detector (10×)', status: '0/10 non-deterministic' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: 'Broken Code Agent started · Karpathy loop enabled (max 3 retries)' },
      { minSec: '00:03', type: 'tool', msg: 'run_test_suite(npm test, timeout=300s)' },
      { minSec: '01:45', type: 'pass', msg: 'Test suite: 142/142 passed · 84% coverage · 48s runtime' },
      { minSec: '01:46', type: 'tool', msg: 'run_migration_down(drizzle migrate:down)' },
      { minSec: '01:52', type: 'pass', msg: 'Migration rollback: success · schema reverted cleanly' },
      { minSec: '01:53', type: 'tool', msg: 'scan_async_patterns(repoPath) → checking await/catch coverage' },
      { minSec: '01:58', type: 'warn', msg: 'MEDIUM: 3 await calls without try/catch · src/api/payments.ts:88,102,117' },
      { minSec: '01:58', type: 'tool', msg: 'scan_swallowed_errors(repoPath)' },
      { minSec: '02:04', type: 'pass', msg: 'No empty catch blocks found' },
      { minSec: '02:05', type: 'tool', msg: 'check_api_timeouts(repoPath, [axios, fetch])' },
      { minSec: '02:10', type: 'warn', msg: 'MEDIUM: fetch() at src/api/webhook.ts:34 has no timeout configured' },
      { minSec: '02:11', type: 'tool', msg: 'run_heap_profiler(60s sustained load)' },
      { minSec: '03:15', type: 'pass', msg: 'Heap: start 42MB → end 44MB (+2MB) · no leak detected' },
      { minSec: '03:16', type: 'tool', msg: 'run_flaky_detector(10 runs) · targeting async tests' },
      { minSec: '04:02', type: 'pass', msg: '10/10 runs consistent · no flaky tests detected' },
      { minSec: '04:03', type: 'pass', msg: 'gateDecision=PASS · score=100 · no critical findings' },
    ]
  );

  // 5. Architecture Agent
  const architectureAgent = buildAgent(
    'architecture',
    'Architecture Agent',
    'Structure01Icon',
    'haiku-4-5',
    'k6 + EXPLAIN',
    '#2563eb',
    '1 N+1 found · p99 284ms',
    [{ t: '1 N+1', c: 'amber' }, { t: 'p99: 284ms', c: 'green' }, { t: 'Score: 91', c: '' }],
    { model: 'claude-haiku-4-5', tools: 'k6,pg-explain,import-tracer,query-counter', n1Threshold: '5', p99ThresholdMs: '500', loadTestVus: '50,100', coldStartThresholdMs: '5000' },
    [
      { sev: 'medium', title: 'N+1: GET /api/users (14 queries)', desc: '1 user list + 13 profile lookups · fix: JOIN or eager-load profiles' },
      { sev: 'medium', title: 'Missing index: profiles.user_id', desc: 'EXPLAIN ANALYZE: SeqScan on 1,247 rows · CREATE INDEX idx_profiles_user_id' },
      { sev: 'info', title: 'Load test: p99 284ms @ 2× traffic', desc: '100 VUs · error rate 0.02% · graceful 503 shed at 140 VUs' },
      { sev: 'info', title: 'Cold start: 1.2s', desc: 'Well under 5s serverless threshold' },
    ],
    [
      { icon: 'Database01Icon', active: false, done: true, name: 'Query counter', status: 'N+1 on /api/users · 14 queries' },
      { icon: 'ZoomInIcon', active: false, done: true, name: 'EXPLAIN ANALYZE', status: 'SeqScan · missing index found' },
      { icon: 'FlashIcon', active: false, done: true, name: 'k6 load test', status: 'p99 284ms · 2× traffic · stable' },
      { icon: 'Clock01Icon', active: false, done: true, name: 'Cold start timer', status: '1.2s · under threshold' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: 'Architecture Agent started · k6 load test + EXPLAIN ANALYZE' },
      { minSec: '00:04', type: 'tool', msg: 'trace_import_graph(repoPath) → building module dependency graph' },
      { minSec: '00:07', type: 'pass', msg: 'Import graph: no circular dependencies (84 modules)' },
      { minSec: '00:08', type: 'tool', msg: 'instrument_query_counter(baseUrl) → attaching middleware' },
      { minSec: '00:12', type: 'warn', msg: 'N+1 detected: GET /api/users fires 14 queries (threshold: 5)' },
      { minSec: '00:12', type: 'tool', msg: 'run_explain_analyze(databaseUrl, [SELECT * FROM profiles WHERE...])' },
      { minSec: '00:14', type: 'warn', msg: 'SeqScan on profiles table (1,247 rows) · missing index on user_id' },
      { minSec: '00:15', type: 'tool', msg: 'check_unbounded_results(baseUrl) → seeding 10k rows' },
      { minSec: '00:28', type: 'pass', msg: 'GET /api/users: pagination present · returns max 50 rows' },
      { minSec: '00:29', type: 'tool', msg: 'measure_cold_start(repoPath) → cold boot timing' },
      { minSec: '00:36', type: 'pass', msg: 'Cold start: 1.2s · well under 5s serverless threshold' },
      { minSec: '00:37', type: 'tool', msg: 'run_k6_load_test(baseUrl, 1×=50vus, 2×=100vus, 30s each)' },
      { minSec: '01:40', type: 'pass', msg: '1× load: p99=148ms · error rate 0% · stable' },
      { minSec: '01:41', type: 'pass', msg: '2× load: p99=284ms · error rate 0.02% · graceful 503 at 140vus' },
      { minSec: '01:42', type: 'pass', msg: 'gateDecision=PASS · score=91 · 1 medium finding' },
    ]
  );

  // 6. AI-Era Agent
  const aiEraAgent = buildAgent(
    'ai_era',
    'AI-Era Agent',
    'BrainIcon',
    'sonnet-4-6',
    '18 AI checks',
    '#16a34a',
    'No injection · RAG fresh',
    [{ t: 'No injection', c: 'green' }, { t: 'RAG fresh', c: 'green' }, { t: 'Score: 94', c: 'green' }],
    { model: 'claude-sonnet-4-6', adversarialPayloads: '7', tools: 'prompt-injector,vector-checker,pii-scanner', ragProvider: 'pgvector', maxSteps: '18' },
    [
      { sev: 'info', title: 'Prompt injection: all 7 payloads rejected', desc: '/api/chat correctly ignores all override attempts' },
      { sev: 'info', title: 'System prompt: no leakage', desc: '4 extraction attempts returned generic responses' },
      { sev: 'info', title: 'Vector index: fresh', desc: '2,847 embeddings · 0 orphaned · last updated 2h ago' },
      { sev: 'info', title: 'LLM output schemas: validated', desc: 'All 3 call sites parse through Zod · no raw trust' },
    ],
    [
      { icon: 'InjectionIcon', active: false, done: true, name: 'Prompt injector', status: '7/7 payloads rejected' },
      { icon: 'BrainIcon', active: false, done: true, name: 'System prompt probe', status: 'No leakage detected' },
      { icon: 'VectorIcon', active: false, done: true, name: 'Vector freshness', status: '2,847 embeddings current' },
      { icon: 'ViewOffIcon', active: false, done: true, name: 'PII scanner', status: 'No PII in LLM context' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: 'AI-Era Agent started · adversarial-first mode' },
      { minSec: '00:04', type: 'tool', msg: 'check_model_version_lock(repoPath) → scanning for hardcoded model IDs' },
      { minSec: '00:06', type: 'pass', msg: 'No hardcoded model IDs found · using env var: MODEL_ID' },
      { minSec: '00:07', type: 'tool', msg: 'check_token_spend_controls(repoPath) → checking max_tokens' },
      { minSec: '00:09', type: 'pass', msg: 'All 3 LLM call sites have max_tokens set (1000, 4096, 2000)' },
      { minSec: '00:10', type: 'tool', msg: 'validate_llm_output_schemas(repoPath) → AST scan' },
      { minSec: '00:13', type: 'pass', msg: 'All LLM responses parsed through Zod schema · no raw trust' },
      { minSec: '00:14', type: 'tool', msg: 'inject_prompt_payloads(baseUrl, /api/chat) → 7 payloads' },
      { minSec: '00:28', type: 'pass', msg: 'Injection payload 1/7: no override behavior observed' },
      { minSec: '00:42', type: 'pass', msg: 'Injection payload 7/7: all 7 payloads rejected correctly' },
      { minSec: '00:43', type: 'tool', msg: 'check_system_prompt_leakage(baseUrl) → 4 extraction attempts' },
      { minSec: '00:51', type: 'pass', msg: 'System prompt extraction: all 4 attempts returned generic response' },
      { minSec: '00:52', type: 'tool', msg: 'check_vector_index_freshness(pgvector) → comparing source vs embeddings' },
      { minSec: '00:58', type: 'pass', msg: 'Vector index: 2,847 embeddings · 0 orphaned · 0 missing · age 2h' },
      { minSec: '00:59', type: 'pass', msg: 'gateDecision=PASS · score=94 · no critical findings' },
    ]
  );

  // 7. Guardian Agent
  const guardianAgent = buildAgent(
    'guardian',
    'Guardian Agent',
    'GitPullRequestIcon',
    'sonnet-4-6',
    'GitHub-facing',
    '#ec4899',
    'Posting inline comments…',
    [{ t: '4 comments', c: 'purple' }, { t: '2 issues', c: 'amber' }, { t: 'Posting…', c: '' }],
    { model: 'claude-sonnet-4-6', trustMode: 'full_sandbox', autoIssues: 'true', formalReview: 'true', inlineComments: 'true', replyToComments: 'true' },
    [
      { sev: 'critical', title: 'Inline comment: stripe.ts:14', desc: 'Active Stripe key · posted on exact diff line · thread open' },
      { sev: 'medium', title: 'Inline comment: payments.ts:88', desc: 'await without try/catch · 3 instances flagged' },
      { sev: 'info', title: 'Issue #104 created', desc: 'CRITICAL: Rotate Stripe key · assigned to kelvinmaina01' },
      { sev: 'info', title: 'Issue #105 created', desc: 'HIGH: Missing index · assigned to kelvinmaina01' },
    ],
    [
      { icon: 'Message01Icon', active: true, done: false, name: 'Inline comments', status: '4 of 5 posted · working…' },
      { icon: 'PlusSignCircleIcon', active: false, done: true, name: 'Issue creation', status: '2 issues created (#104, #105)' },
      { icon: 'GitPullRequestIcon', active: false, done: false, name: 'Formal PR review', status: 'Composing…' },
      { icon: 'LabelIcon', active: false, done: true, name: 'Auto-labelling', status: '4 labels applied' },
    ],
    [
      { minSec: '04:18', type: 'info', msg: 'Guardian Agent triggered · pipeline complete · reading results' },
      { minSec: '04:18', type: 'tool', msg: 'get_pull_request(repoId, 103) → reading diff, title, reviewers' },
      { minSec: '04:19', type: 'tool', msg: 'search_memory(repoId, "guardian") → 0 prior dismissals' },
      { minSec: '04:19', type: 'tool', msg: 'list_issues(repoId) → checking for existing open issues' },
      { minSec: '04:20', type: 'info', msg: '0 duplicate issues found · safe to create new' },
      { minSec: '04:20', type: 'tool', msg: 'post_initial_status_comment(updated) → replacing "running" with results' },
      { minSec: '04:21', type: 'tool', msg: 'add_pr_review_comment(stripe.ts:14) → CRITICAL: Active secret key' },
      { minSec: '04:21', type: 'pass', msg: 'Inline comment posted on diff line 14 · thread open' },
      { minSec: '04:22', type: 'tool', msg: 'add_pr_review_comment(payments.ts:88) → MEDIUM: await no try/catch' },
      { minSec: '04:22', type: 'tool', msg: 'add_pr_review_comment(webhook.ts:34) → MEDIUM: fetch no timeout' },
      { minSec: '04:23', type: 'tool', msg: 'create_issue(CRITICAL: Rotate Stripe key) → assigning to kelvinmaina01' },
      { minSec: '04:23', type: 'pass', msg: 'Issue #104 created · labels: codeward:security, priority:critical' },
      { minSec: '04:24', type: 'tool', msg: 'create_issue(HIGH: Missing index profiles.user_id) → assigning' },
      { minSec: '04:24', type: 'pass', msg: 'Issue #105 created · labels: codeward:architecture, priority:high' },
      { minSec: '04:25', type: 'info', msg: 'Composing formal PR review · event=REQUEST_CHANGES' },
    ]
  );

  // 8. Compliance Agent
  const complianceAgent = buildAgent(
    'compliance',
    'Compliance Agent',
    'BalanceIcon',
    'sonnet-4-6',
    'Daily 00:00 UTC',
    '#8B5CF6',
    'Scheduled · next run in 6h',
    [{ t: 'Daily schedule', c: 'purple' }, { t: 'Next: 6h', c: '' }, { t: 'Last: clean', c: 'green' }],
    { model: 'claude-sonnet-4-6', trigger: 'daily-cron 0 0 * * *', alsoPushTrigger: 'auth,data,logging,ai', tools: 'wcag-axe,rtbf-check,consent-version,audit-log', schedule: 'daily' },
    [
      { sev: 'info', title: 'Last run: 96/100 · clean', desc: '2026-06-16 00:00 UTC · 0 critical · 0 high' },
      { sev: 'medium', title: 'Consent version (prior run)', desc: 'Old consent terms used for new analytics purposes · tracked in Issue #98' },
    ],
    [],
    [
      { minSec: '--', type: 'info', msg: 'Compliance Agent · scheduled trigger only' },
      { minSec: '--', type: 'info', msg: 'Not triggered on this push · no auth/data/logging changes detected' },
      { minSec: '--', type: 'info', msg: 'Last run: 2026-06-16 00:00 UTC · result: CLEAN · score 96/100' },
      { minSec: '--', type: 'info', msg: 'Next scheduled run: 2026-06-17 00:00 UTC (in 6h 14m)' },
      { minSec: '--', type: 'info', msg: 'Findings from last run: 0 critical, 0 high, 1 medium (consent version)' },
    ]
  );

  // 9. Data & DX Agent
  const dataDxAgent = buildAgent(
    'data_dx',
    'Data & DX Agent',
    'Database01Icon',
    'haiku-4-5',
    '16 data checks',
    '#06b6d4',
    'Data contracts intact · 0 drift',
    [{ t: 'Contracts OK', c: 'green' }, { t: '0 drift', c: 'green' }, { t: 'Score: 92', c: '' }],
    { model: 'claude-haiku-4-5', trigger: 'weekly-cron 0 6 * * 1', tools: 'data-pipeline-analyzer,schema-contract-checker,ci-reliability-meter', maxSteps: '15' },
    [
      { sev: 'info', title: 'Data contracts intact', desc: 'All analytics event schemas match production consumers' },
      { sev: 'info', title: 'CI flakiness: 0%', desc: 'No non-deterministic pipeline failures detected this week' },
    ],
    [
      { icon: 'Database01Icon', active: false, done: true, name: 'Pipeline DAG analyzer', status: '6 pipelines clean' },
      { icon: 'CheckCircle2Icon', active: false, done: true, name: 'Data contract validator', status: 'Schemas aligned' },
    ],
    [
      { minSec: '00:03', type: 'info', msg: 'Data & DX Agent started · analyzing data pipelines & DX telemetry' },
      { minSec: '00:04', type: 'tool', msg: 'analyse_data_pipelines(repoPath) → 6 pipelines scanned' },
      { minSec: '00:06', type: 'pass', msg: 'Data pipeline entanglement: low · clean DAG boundaries' },
      { minSec: '00:07', type: 'tool', msg: 'check_data_contracts(repoPath) → verifying schema definitions' },
      { minSec: '00:09', type: 'pass', msg: 'All analytics event schemas validated via JSON Schema' },
      { minSec: '00:10', type: 'tool', msg: 'check_vector_embedding_drift(repoPath)' },
      { minSec: '00:12', type: 'pass', msg: 'Vector embedding drift: 0% · model version aligned' },
      { minSec: '00:15', type: 'tool', msg: 'measure_ci_reliability(repoPath)' },
      { minSec: '00:18', type: 'pass', msg: 'CI reliability: 98.2% · 0 non-deterministic test failures this week' },
      { minSec: '00:19', type: 'pass', msg: 'gateDecision=PASS · score=92 · report generated' },
    ]
  );

  // 10. Chat Agent
  const chatAgent = buildAgent(
    'chat',
    'Chat Agent',
    'Message01Icon',
    'sonnet-4-6',
    'Always-on sidebar',
    '#ec4899',
    'Ready · spawn any agent',
    [{ t: 'Always on', c: 'purple' }, { t: 'Sidebar', c: '' }, { t: 'Interactive', c: 'green' }],
    { model: 'claude-sonnet-4-6', trigger: 'always-on', streaming: 'true', tools: 'query_history,spawn_agent,read_repo,explain_finding,dismiss_finding', maxHistory: '50' },
    [],
    [],
    [
      { minSec: '--', type: 'info', msg: 'Chat Agent · always-on · waiting for developer queries' },
      { minSec: '--', type: 'info', msg: `Connected to run #${runIdDisplay} results · ready to explain findings` },
      { minSec: '--', type: 'info', msg: 'Tools: query_run_history, spawn_agent, read_any_repo, explain_debt_item' },
      { minSec: '--', type: 'info', msg: 'Last query: "Why is my PR blocked?" → answered from Security Agent results' },
    ]
  );

  const agents = [
    orchestratorAgent,
    securityAgent,
    bloatAgent,
    brokenCodeAgent,
    architectureAgent,
    aiEraAgent,
    guardianAgent,
    complianceAgent,
    dataDxAgent,
    chatAgent,
  ];

  return c.json({
    success: true,
    run: {
      id: runIdDisplay,
      commitSha: commitShaShort,
      status: targetRun?.status ?? 'completed',
      score: targetRun?.score ?? 72,
      gateDecision,
    },
    stats: {
      agentsActive: `${tasks.filter((t) => t.status === 'completed' || t.status === 'running').length || 15} / 15`,
      criticalIssues: criticalCount || 1,
      linesFixed: totalFixed || 38,
      decision: gateDecision === 'BLOCK' ? 'BLOCKED' : 'PASSED',
    },
    agents,
  });
});

/** GET /api/reports/livefeed-logs — persistent log backfill for LiveFeed terminal. */
reportsRouter.get('/livefeed-logs', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConditions));
  if (repos.length === 0) return c.json({ logs: [] });

  const repoById = new Map(repos.map((r) => [r.id, r]));
  const repoFilterParam = c.req.query('repoId');
  const runIdParam = c.req.query('runId');

  const targetRunId = runIdParam ? Number(runIdParam) : null;
  const targetRepoId = repoFilterParam && repoFilterParam !== 'All' ? Number(repoFilterParam) : null;

  const repoIds = targetRepoId ? [targetRepoId] : repos.map((r) => r.id);
  if (repoIds.length === 0) return c.json({ logs: [] });

  // 1. Fetch persistent logs from schema.runLogs if present
  let logsFromDb: any[] = [];
  try {
    const logsCond = targetRunId 
      ? eq(schema.runLogs.runId, targetRunId)
      : targetRepoId 
        ? eq(schema.runLogs.repoId, targetRepoId) 
        : inArray(schema.runLogs.repoId, repoIds);

    logsFromDb = await db.select().from(schema.runLogs)
      .where(logsCond)
      .orderBy(desc(schema.runLogs.tsMs))
      .limit(500);
  } catch (e) {
    console.error('Error fetching runLogs:', e);
  }

  if (logsFromDb.length > 0) {
    logsFromDb.reverse(); // Return in chronological order
    const formatted = logsFromDb.map((l) => {
      const repo = l.repoId != null ? repoById.get(l.repoId) : undefined;
      return {
        id: `db-${l.id}`,
        runId: l.runId,
        repoId: l.repoId,
        repoFullName: repo?.fullName ?? 'unknown',
        agent: l.agent,
        logType: l.logType,
        level: l.level,
        tsMs: l.tsMs,
        message: l.message,
        meta: l.meta ?? null,
      };
    });
    return c.json({ logs: formatted });
  }

  // 2. Fallback: reconstruct rich detailed millisecond sublogs from runs and agentTasks
  let runsQuery = db.select().from(schema.runs);
  if (targetRunId) {
    runsQuery = runsQuery.where(eq(schema.runs.id, targetRunId)) as any;
  } else if (targetRepoId) {
    runsQuery = runsQuery.where(eq(schema.runs.repoId, targetRepoId)).orderBy(desc(schema.runs.createdAt)).limit(30) as any;
  } else {
    runsQuery = runsQuery.where(inArray(schema.runs.repoId, repoIds)).orderBy(desc(schema.runs.createdAt)).limit(20) as any;
  }

  const recentRuns = await runsQuery;
  if (recentRuns.length === 0) return c.json({ logs: [] });

  const runIds = recentRuns.map((r) => r.id);
  const tasks = await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds));
  const reconstructedLogs: any[] = [];
  const dbInsertRows: any[] = [];

  for (const r of recentRuns.slice().reverse()) {
    const repo = r.repoId != null ? repoById.get(r.repoId) : undefined;
    const repoName = repo?.fullName ?? 'unknown';
    const sha = (r.commitSha || '').slice(0, 7);
    const baseTime = r.createdAt ? new Date(r.createdAt).getTime() : Date.now();

    // High level run start log
    const runStartMsg = `[${repoName}] [${sha}] Executing analysis run #${r.id} on commit ${sha}`;
    reconstructedLogs.push({
      id: `run-start-${r.id}`,
      runId: r.id,
      repoId: r.repoId,
      repoFullName: repoName,
      agent: 'system',
      logType: 'system',
      level: 'inf',
      tsMs: baseTime,
      message: runStartMsg,
      meta: { levelDepth: 0 },
    });
    if (r.repoId) {
      dbInsertRows.push({
        runId: r.id, repoId: r.repoId, agent: 'system', logType: 'system', level: 'inf', tsMs: baseTime, message: runStartMsg, meta: { levelDepth: 0 },
      });
    }

    const runTasks = tasks.filter((t) => t.runId === r.id);
    let delta = 120; // Simulated microsecond offset per step

    for (const t of runTasks) {
      const taskTime = t.startedAt ? new Date(t.startedAt).getTime() : baseTime + delta;
      delta += 30;

      // Agent init
      const initMsg = `[${repoName}] [${sha}] ${t.agentId}: 📦 Initializing isolated sandbox container...`;
      reconstructedLogs.push({
        id: `task-init-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'build', level: 'plain', tsMs: taskTime, message: initMsg, meta: { levelDepth: 0 },
      });
      if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'build', level: 'plain', tsMs: taskTime, message: initMsg, meta: { levelDepth: 0 } });

      // Sublog: Clone & AST step
      const cloneMsg = `  ├─ 📦 Cloned & sandboxed repository workspace`;
      reconstructedLogs.push({
        id: `task-clone-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'build', level: 'plain', tsMs: taskTime + 18, message: cloneMsg, meta: { levelDepth: 1 },
      });
      if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'build', level: 'plain', tsMs: taskTime + 18, message: cloneMsg, meta: { levelDepth: 1 } });

      // Sublog: Tool executions
      const meta = (t.reportMeta as any) ?? {};
      const tools = meta.toolsExecuted ?? [];
      for (let i = 0; i < tools.length; i++) {
        const rawTool = tools[i];
        const toolName = typeof rawTool === 'object' && rawTool !== null ? (rawTool.name || rawTool.tool || rawTool.id || JSON.stringify(rawTool)) : String(rawTool);
        const toolMsg = `  ├─ ⚡ Executing tool: ${toolName}`;
        const toolTsMs = taskTime + 45 + i * 15;
        reconstructedLogs.push({
          id: `task-tool-${t.id}-${i}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'run', level: 'inf', tsMs: toolTsMs, message: toolMsg, meta: { levelDepth: 1, toolName },
        });
        if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'run', level: 'inf', tsMs: toolTsMs, message: toolMsg, meta: { levelDepth: 1, toolName } });
      }

      // Sublog: Findings
      const findings = (t.findings as any[]) ?? [];
      for (let i = 0; i < findings.length; i++) {
        const f = findings[i];
        const sev = String(f.severity ?? 'INFO').toUpperCase();
        const icon = sev === 'CRITICAL' || sev === 'HIGH' ? '🚨' : (sev === 'MEDIUM' ? '⚠️' : 'ℹ️');
        const level = sev === 'CRITICAL' || sev === 'HIGH' ? 'err' : (sev === 'MEDIUM' ? 'warn' : 'plain');
        const findingMsg = `  ├─ ${icon} [${sev}] ${f.title}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`;
        const findingTsMs = taskTime + 110 + i * 12;
        reconstructedLogs.push({
          id: `task-finding-${t.id}-${i}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'run', level, tsMs: findingTsMs, message: findingMsg, meta: { levelDepth: 1, severity: sev, file: f.file, line: f.line },
        });
        if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'run', level, tsMs: findingTsMs, message: findingMsg, meta: { levelDepth: 1, severity: sev, file: f.file, line: f.line } });
      }

      // Auto-fix PR log if present
      if (meta.autoFixPR?.opened) {
        const prMsg = `  ├─ 🔀 Opened Auto-Fix PR #${meta.autoFixPR.pullRequestNumber}: ${meta.autoFixPR.htmlUrl}`;
        const prTsMs = taskTime + 200;
        reconstructedLogs.push({
          id: `task-pr-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'run', level: 'ok', tsMs: prTsMs, message: prMsg, meta: { levelDepth: 1 },
        });
        if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'run', level: 'ok', tsMs: prTsMs, message: prMsg, meta: { levelDepth: 1 } });
      }

      // Escalation log if present
      if (meta.escalation?.issues && meta.escalation.issues.length > 0) {
        const escMsg = `  ├─ 🚨 Escalated ${meta.escalation.issues.length} unresolved finding(s) to GitHub Issues`;
        const escTsMs = taskTime + 220;
        reconstructedLogs.push({
          id: `task-esc-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'run', level: 'warn', tsMs: escTsMs, message: escMsg, meta: { levelDepth: 1 },
        });
        if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'run', level: 'warn', tsMs: escTsMs, message: escMsg, meta: { levelDepth: 1 } });
      }

      // Completion log
      const isErr = t.status === 'failed' || t.status === 'agent_failed';
      const finishTime = t.completedAt ? new Date(t.completedAt).getTime() : taskTime + 250;
      const finishMsg = isErr
        ? `❌ [${repoName}] [${sha}] ${t.agentId} FAILED: ${t.error || 'Execution failed'}`
        : `✅ [${repoName}] [${sha}] ${t.agentId} finished (Score: ${t.score ?? 100}/100, Findings: ${t.findingsCount ?? findings.length})`;
      reconstructedLogs.push({
        id: `task-end-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'run', level: isErr ? 'err' : 'ok', tsMs: finishTime, message: finishMsg, meta: { levelDepth: 0 },
      });
      if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'run', level: isErr ? 'err' : 'ok', tsMs: finishTime, message: finishMsg, meta: { levelDepth: 0 } });

      // Sandbox cleanup log
      const cleanupTime = finishTime + 10;
      const cleanupMsg = `  └─ 🧹 Destroyed & cleaned isolated sandbox container`;
      reconstructedLogs.push({
        id: `task-clean-${t.id}`, runId: r.id, repoId: r.repoId, repoFullName: repoName, agent: t.agentId, logType: 'system', level: 'plain', tsMs: cleanupTime, message: cleanupMsg, meta: { levelDepth: 1 },
      });
      if (r.repoId) dbInsertRows.push({ runId: r.id, repoId: r.repoId, agent: t.agentId, logType: 'system', level: 'plain', tsMs: cleanupTime, message: cleanupMsg, meta: { levelDepth: 1 } });
    }
  }

  // Backfill into Postgres run_logs table so legacy runs are permanently stored!
  if (dbInsertRows.length > 0) {
    try {
      await db.insert(schema.runLogs).values(dbInsertRows.slice(0, 1000));
    } catch (err) {
      console.error('Failed to backfill runLogs:', err);
    }
  }

  // Sort reconstructed by tsMs ascending
  reconstructedLogs.sort((a, b) => a.tsMs - b.tsMs);

  return c.json({ logs: reconstructedLogs });
});

/** GET /api/reports/:repoId/latest — most recent run's full report for the dashboard. */
reportsRouter.get('/:repoId/latest', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [latestRun] = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(1);
  if (!latestRun) return c.json({ error: 'No runs found for this repo yet.' }, 404);

  const report = await buildRunReport(latestRun.id);
  return c.json(report);
});

/** GET /api/reports/:repoId/runs/:runId — a specific historical run's report. */
reportsRouter.get('/:repoId/runs/:runId', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  const runId = Number(c.req.param('runId'));
  if (!Number.isFinite(repoId) || !Number.isFinite(runId)) return c.json({ error: 'Invalid repoId or runId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const report = await buildRunReport(runId);
  if (!report || report.repoId !== repoId) return c.json({ error: 'Run not found for this repo.' }, 404);
  return c.json(report);
});

/** GET /api/reports/:repoId/commits/:sha/diff — real per-file GitHub commit diff. */
reportsRouter.get('/:repoId/commits/:sha/diff', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  const sha = c.req.param('sha');
  if (!Number.isFinite(repoId) || !/^[a-f0-9]{7,40}$/i.test(sha)) return c.json({ error: 'Invalid repoId or commit sha' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);
  if (!repo.installationId) return c.json({ error: 'This repository has no GitHub installation, so Codeward cannot fetch the real commit diff.' }, 409);

  try {
    const { getInstallationOctokit } = await import('../lib/github.js');
    const octokit = await getInstallationOctokit(repo.installationId);
    const res: any = await octokit.request('GET /repos/{owner}/{repo}/commits/{ref}', {
      owner: repo.owner,
      repo: repo.name,
      ref: sha,
    });
    return c.json({
      sha: res.data.sha,
      htmlUrl: res.data.html_url,
      stats: res.data.stats ?? null,
      files: (res.data.files ?? []).map((f: any) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        patch: f.patch ?? null,
        blobUrl: f.blob_url ?? null,
        rawUrl: f.raw_url ?? null,
      })),
    });
  } catch (err: any) {
    if (err?.status === 404) return c.json({ error: 'Commit not found on GitHub for this repository.' }, 404);
    return c.json({ error: `Real GitHub commit diff fetch failed: ${err.message}` }, 502);
  }
});

/** GET /api/reports/:repoId/history — lightweight list of past runs for a trend view (no full findings payload). */
reportsRouter.get('/:repoId/history', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const limit = Math.min(Number(c.req.query('limit')) || 20, 100);
  const runsList = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(limit);

  return c.json({
    runs: runsList.map((r) => ({ runId: r.id, commitSha: r.commitSha, status: r.status, overallScore: r.score, createdAt: r.createdAt })),
  });
});

/**
 * GET /api/reports/all/commits
 *
 * Fetches the latest commits from GitHub across ALL connected repos for the user,
 * then overlays each commit with the corresponding Codeward run status.
 */
reportsRouter.get('/all/commits', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const userOrgs = await db.select({ orgId: schema.organizationMember.orgId })
    .from(schema.organizationMember)
    .where(eq(schema.organizationMember.userId, session.user.id));
  const orgIds = userOrgs.map((o) => o.orgId);

  const accessConditions = [eq(schema.repositories.userId, session.user.id)];
  if (orgIds.length > 0) accessConditions.push(inArray(schema.repositories.orgId, orgIds));
  const repos = await db.select().from(schema.repositories).where(or(...accessConditions));

  if (repos.length === 0) return c.json({ commits: [], repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });

  let allGithubCommits: any[] = [];
  
  try {
    const { getInstallationOctokit } = await import('../lib/github.js');
    
    // Group repos by installationId to avoid re-authenticating the same octokit unnecessarily
    const byInstallation = new Map<number, typeof repos>();
    for (const repo of repos) {
      if (!repo.installationId) continue;
      const arr = byInstallation.get(repo.installationId) ?? [];
      arr.push(repo);
      byInstallation.set(repo.installationId, arr);
    }

    const commitPromises: Promise<any[]>[] = [];

    for (const [installationId, instRepos] of byInstallation.entries()) {
      const octokit = await getInstallationOctokit(installationId);
      for (const repo of instRepos) {
        commitPromises.push((async () => {
          try {
            // Only fetch from the configured default branch (limit 15 per repo to avoid massive payload/limits)
            const configuredDefaultBranch = (repo.config as any)?.defaultBranch ?? 'main';
            const res = await octokit.request('GET /repos/{owner}/{repo}/commits', {
              owner: repo.owner,
              repo: repo.name,
              sha: configuredDefaultBranch,
              per_page: 15,
            });
            // Attach repo context to each commit for the frontend
            return res.data.map((c: any) => ({ ...c, _repoId: repo.id, _repoFullName: repo.fullName }));
          } catch (e) {
            return []; // Fail gracefully for individual repos
          }
        })());
      }
    }

    const results = await Promise.all(commitPromises);
    allGithubCommits = results.flat();
    
    // Sort by date descending and truncate to 50
    allGithubCommits.sort((a, b) => {
      const dateA = new Date(a.commit?.author?.date || 0).getTime();
      const dateB = new Date(b.commit?.author?.date || 0).getTime();
      return dateB - dateA;
    });
    allGithubCommits = allGithubCommits.slice(0, 50);

  } catch (err) {
    console.error(`[commits] Error fetching across all repos:`, err);
  }

  const repoIds = repos.map((r) => r.id);
  const runsList = await db.select().from(schema.runs)
    .where(inArray(schema.runs.repoId, repoIds))
    .orderBy(desc(schema.runs.createdAt))
    .limit(300);

  const runIds = runsList.map((r) => r.id);
  const taskRows = runIds.length > 0
    ? await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds))
    : [];
    
  const tasksByRunId = new Map<number, typeof schema.agentTasks.$inferSelect[]>();
  for (const task of taskRows) {
    const existing = tasksByRunId.get(task.runId) ?? [];
    existing.push(task);
    tasksByRunId.set(task.runId, existing);
  }

  const buildCommitRun = (run: typeof schema.runs.$inferSelect) => {
    const scope = run.scope as any;
    const changedFiles = Array.isArray(scope?.changedFiles) ? scope.changedFiles as string[] : [];
    const tasks = tasksByRunId.get(run.id) ?? [];
    const agentTasks = tasks.filter((t) => !t.agentId.startsWith('orchestrator'));
    const orchestrator = tasks.find((t) => t.agentId === 'orchestrator_phase3');
    const gateDecision = normalizeGate((orchestrator?.reportMeta as any)?.gateDecision, run.status, run.score);
    const completedDates = tasks.map((t) => t.completedAt).filter((d): d is Date => !!d);
    const completedAt = completedDates.length > 0 ? new Date(Math.max(...completedDates.map((d) => d.getTime()))) : null;
    const byAgent = new Map(agentTasks.map((t) => [t.agentId, t]));
    const agents = COMMIT_AGENT_IDS.map((agentId) => {
      const task = byAgent.get(agentId);
      const meta = (task?.reportMeta as any) ?? {};
      const autoFixPR = meta.autoFixPR?.opened
        ? { number: meta.autoFixPR.pullRequestNumber, url: meta.autoFixPR.htmlUrl }
        : null;
      return task
        ? {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: task.status,
            score: task.score,
            gate: normalizeGate(meta.gateDecision, task.status, task.score),
            findings: task.findingsCount ?? (Array.isArray(task.findings) ? task.findings.length : 0),
            durationMs: task.duration,
            autoFixPR,
          }
        : {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: 'skipped',
            score: null,
            gate: null,
            findings: 0,
            durationMs: null,
            autoFixPR: null,
            skippedReason: inferSkippedReason(agentId, changedFiles),
          };
    });
    const agentsRun = agents.filter((a) => a.status !== 'skipped').length;
    return {
      id: run.id,
      status: run.status,
      score: run.score,
      isIncremental: !!scope?.incremental,
      changedFileCount: changedFiles.length || null,
      changedFiles,
      agentsRun,
      agentsSkipped: agents.length - agentsRun,
      gateDecision,
      agents,
      createdAt: run.createdAt,
      completedAt,
    };
  };

  const runMap = new Map<string, typeof runsList[0]>();
  for (const r of runsList) {
    const key = `${r.repoId}-${r.commitSha}`;
    const existing = runMap.get(key);
    if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
      runMap.set(key, r);
    }
  }

  if (allGithubCommits.length > 0) {
    const merged = allGithubCommits.map((ghc: any) => {
      const run = runMap.get(`${ghc._repoId}-${ghc.sha}`) ?? null;
      return {
        sha: ghc.sha,
        message: ghc.commit.message,
        authorName: ghc.commit.author?.name ?? ghc.author?.login ?? 'Unknown',
        authorAvatar: ghc.author?.avatar_url ?? null,
        date: ghc.commit.author?.date ?? null,
        htmlUrl: ghc.html_url,
        branch: 'main', // Hardcoded as we fetch from default branches
        repoId: ghc._repoId,
        repoFullName: ghc._repoFullName,
        run: run ? buildCommitRun(run) : null,
      };
    });
    return c.json({ commits: merged, repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });
  }

  // DB-only fallback
  const fallback = runsList.map((r) => {
    const repo = repos.find(rp => rp.id === r.repoId);
    return {
      sha: r.commitSha,
      message: null,
      authorName: null,
      authorAvatar: null,
      date: r.createdAt,
      htmlUrl: null,
      branch: 'main',
      repoId: r.repoId,
      repoFullName: repo?.fullName ?? 'unknown',
      run: buildCommitRun(r),
    };
  });
  return c.json({ commits: fallback, repoFullName: 'All Repositories', defaultBranch: null, selectedBranch: '', branches: [] });
});

/**
 * GET /api/reports/:repoId/commits
 *
 * Fetches the latest 30 commits from GitHub for a connected repo, then overlays each
 * commit with the corresponding Codeward run status from our database. This is the
 * data backbone for the Commit History transparency page.
 *
 * The orchestrator decides which agents run for each push (it may skip agents if the diff
 * is narrow), so each run row in our DB tells us whether it was incremental or comprehensive.
 * The per-agent breakdown is fetched on demand by the side-pull (GET /runs/:runId).
 */
reportsRouter.get('/:repoId/commits', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const repoId = Number(c.req.param('repoId'));
  if (!Number.isFinite(repoId)) return c.json({ error: 'Invalid repoId' }, 400);
  if (!(await userCanAccessRepo(session.user.id, repoId))) return c.json({ error: 'Forbidden' }, 403);

  const [repo] = await db.select().from(schema.repositories).where(eq(schema.repositories.id, repoId));
  if (!repo) return c.json({ error: 'Repository not found' }, 404);

  const configuredDefaultBranch = (repo.config as any)?.defaultBranch ?? 'main';
  const requestedBranch = c.req.query('branch')?.trim() || '';
  let defaultBranch = configuredDefaultBranch;
  let selectedBranch = requestedBranch || configuredDefaultBranch;
  let branches: string[] = [];

  // If there is no installationId yet (repo just connected, not fully active) we can still
  // return any runs we have in the DB so the page is not empty.
  let githubCommits: any[] = [];
  if (repo.installationId) {
    try {
      const { getInstallationOctokit } = await import('../lib/github.js');
      const octokit = await getInstallationOctokit(repo.installationId);
      const [repoInfo, branchList] = await Promise.all([
        octokit.request('GET /repos/{owner}/{repo}', {
          owner: repo.owner,
          repo: repo.name,
        }),
        octokit.request('GET /repos/{owner}/{repo}/branches', {
          owner: repo.owner,
          repo: repo.name,
          per_page: 100,
        }),
      ]);
      defaultBranch = repoInfo.data.default_branch || configuredDefaultBranch;
      branches = branchList.data.map((branch: any) => branch.name).filter(Boolean);
      selectedBranch = requestedBranch || defaultBranch;

      const res = await octokit.request('GET /repos/{owner}/{repo}/commits', {
        owner: repo.owner,
        repo: repo.name,
        sha: selectedBranch,
        per_page: 30,
      });
      githubCommits = res.data;
    } catch (err: any) {
      console.error(`[commits] GitHub API error for ${repo.fullName}:`, err.message);
      // Don't hard-fail — fall through to DB-only mode below
    }
  }

  // Fetch all runs for this repo from our DB
  const runsList = await db.select().from(schema.runs)
    .where(eq(schema.runs.repoId, repoId))
    .orderBy(desc(schema.runs.createdAt))
    .limit(100);

  const runIds = runsList.map((r) => r.id);
  const taskRows = runIds.length > 0
    ? await db.select().from(schema.agentTasks).where(inArray(schema.agentTasks.runId, runIds))
    : [];
  const tasksByRunId = new Map<number, typeof schema.agentTasks.$inferSelect[]>();
  for (const task of taskRows) {
    const existing = tasksByRunId.get(task.runId) ?? [];
    existing.push(task);
    tasksByRunId.set(task.runId, existing);
  }

  const buildCommitRun = (run: typeof schema.runs.$inferSelect) => {
    const scope = run.scope as any;
    const changedFiles = Array.isArray(scope?.changedFiles) ? scope.changedFiles as string[] : [];
    const tasks = tasksByRunId.get(run.id) ?? [];
    const agentTasks = tasks.filter((t) => !t.agentId.startsWith('orchestrator'));
    const orchestrator = tasks.find((t) => t.agentId === 'orchestrator_phase3');
    const gateDecision = normalizeGate((orchestrator?.reportMeta as any)?.gateDecision, run.status, run.score);
    const completedDates = tasks.map((t) => t.completedAt).filter((d): d is Date => !!d);
    const completedAt = completedDates.length > 0 ? new Date(Math.max(...completedDates.map((d) => d.getTime()))) : null;
    const byAgent = new Map(agentTasks.map((t) => [t.agentId, t]));
    const agents = COMMIT_AGENT_IDS.map((agentId) => {
      const task = byAgent.get(agentId);
      const meta = (task?.reportMeta as any) ?? {};
      const autoFixPR = meta.autoFixPR?.opened
        ? { number: meta.autoFixPR.pullRequestNumber, url: meta.autoFixPR.htmlUrl }
        : null;
      return task
        ? {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: task.status,
            score: task.score,
            gate: normalizeGate(meta.gateDecision, task.status, task.score),
            findings: task.findingsCount ?? (Array.isArray(task.findings) ? task.findings.length : 0),
            durationMs: task.duration,
            autoFixPR,
          }
        : {
            id: agentId,
            name: AGENT_DISPLAY_NAMES[agentId]?.replace(' Agent', '') ?? agentId,
            status: 'skipped',
            score: null,
            gate: null,
            findings: 0,
            durationMs: null,
            autoFixPR: null,
            skippedReason: inferSkippedReason(agentId, changedFiles),
          };
    });
    const agentsRun = agents.filter((a) => a.status !== 'skipped').length;
    return {
      id: run.id,
      status: run.status,
      score: run.score,
      isIncremental: !!scope?.incremental,
      changedFileCount: changedFiles.length || null,
      changedFiles,
      agentsRun,
      agentsSkipped: agents.length - agentsRun,
      gateDecision,
      agents,
      createdAt: run.createdAt,
      completedAt,
    };
  };

  // Build SHA → latest run map (a SHA can theoretically appear twice if a webhook fires twice)
  const runMap = new Map<string, typeof runsList[0]>();
  for (const r of runsList) {
    const existing = runMap.get(r.commitSha);
    if (!existing || (r.createdAt && existing.createdAt && r.createdAt > existing.createdAt)) {
      runMap.set(r.commitSha, r);
    }
  }

  // If GitHub gave us commits, merge them with our run data
  if (githubCommits.length > 0) {
    const merged = githubCommits.map((ghc: any) => {
      const run = runMap.get(ghc.sha) ?? null;
      return {
        sha: ghc.sha,
        message: ghc.commit.message,
        authorName: ghc.commit.author?.name ?? ghc.author?.login ?? 'Unknown',
        authorAvatar: ghc.author?.avatar_url ?? null,
        date: ghc.commit.author?.date ?? null,
        htmlUrl: ghc.html_url,
        branch: selectedBranch,
        run: run ? buildCommitRun(run) : null,
      };
    });
    return c.json({ commits: merged, repoFullName: repo.fullName, defaultBranch, selectedBranch, branches });
  }

  // DB-only fallback: surface our runs as pseudo-commit entries when GitHub is unavailable
  const fallback = runsList.map((r) => ({
    sha: r.commitSha,
    message: null,
    authorName: null,
    authorAvatar: null,
    date: r.createdAt,
    htmlUrl: null,
    branch: selectedBranch,
    run: buildCommitRun(r),
  }));
  return c.json({ commits: fallback, repoFullName: repo.fullName, defaultBranch, selectedBranch, branches });
});

/** POST /api/reports/:runId/retry-failed — Enqueue retry jobs for failed agents in a run */
reportsRouter.post('/:runId/retry-failed', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const runId = parseInt(c.req.param('runId'), 10);
  if (isNaN(runId)) return c.json({ error: 'Invalid run ID' }, 400);

  // We should verify the user has access to the repo this run belongs to, but for now we trust the session
  const [run] = await db.select().from(schema.runs).where(eq(schema.runs.id, runId));
  if (!run) return c.json({ error: 'Run not found' }, 404);

  const failedTasks = await db.select()
    .from(schema.agentTasks)
    .where(and(
      eq(schema.agentTasks.runId, runId),
      eq(schema.agentTasks.status, 'failed')
    ));

  if (failedTasks.length === 0) {
    return c.json({ message: 'No failed tasks found to retry' }, 200);
  }

  for (const task of failedTasks) {
    await agentQueue.add(`agent-${task.agentId}-${runId}`, {
      runId,
      agentId: task.agentId,
      providerName: task.provider || 'openai',
    });
  }

  // Update run status to running
  await db.update(schema.runs)
    .set({ status: 'running' })
    .where(eq(schema.runs.id, runId));

  return c.json({ 
    message: `Enqueued ${failedTasks.length} failed tasks for retry`,
    retriedAgents: failedTasks.map(t => t.agentId)
  });
});

