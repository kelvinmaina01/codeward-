import { db } from '../db/index.js';
import { runs, agentTasks, repositories, user, organization, mergeApprovals } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { sanitizeTerminalLogs } from '../notifications/templates/components/TerminalLogBox.js';

export interface ResolvedRunCompletedData {
  recipientEmail: string;
  recipientName: string;
  recipientMeta?: string;
  repoName: string;
  prNumber?: number | null;
  prTitle?: string;
  commitSha: string;
  branch?: string;
  gateDecision: 'PASS' | 'WARN' | 'BLOCK';
  overallScore: number;
  tasks: Array<{
    agentId: string;
    status: string;
    score?: number | null;
    findingsCount?: number | null;
    durationMs?: number | null;
  }>;
  criticalFindings: Array<{
    severity: string;
    category: string;
    title: string;
    file?: string;
    line?: number;
  }>;
  autoFixPrUrl?: string | null;
  logTail?: string;
  dashboardUrl: string;
  prGithubUrl?: string;
}

export class EmailPayloadResolver {
  private static getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'https://codeward.cloud';
  }

  /**
   * Dynamically aggregates all data needed for a PR Run Completed email
   */
  static async resolveRunCompleted(runId: number): Promise<ResolvedRunCompletedData | null> {
    const frontendUrl = this.getFrontendUrl();

    // 1. Fetch Run + Repository
    const [runRow] = await db
      .select({
        id: runs.id,
        repoId: runs.repoId,
        commitSha: runs.commitSha,
        score: runs.score,
        prNumber: runs.prNumber,
        rawLogs: runs.rawLogs,
        createdAt: runs.createdAt,
      })
      .from(runs)
      .where(eq(runs.id, runId))
      .limit(1);

    if (!runRow || !runRow.repoId) return null;

    // 2. Fetch Repository + Owner User
    const [repoRow] = await db
      .select({
        id: repositories.id,
        fullName: repositories.fullName,
        owner: repositories.owner,
        name: repositories.name,
        userId: repositories.userId,
        orgId: repositories.orgId,
      })
      .from(repositories)
      .where(eq(repositories.id, runRow.repoId))
      .limit(1);

    if (!repoRow) return null;

    // 3. Resolve user email
    let recipientEmail = '';
    let recipientName = 'Developer';

    if (repoRow.userId) {
      const [userRow] = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(eq(user.id, repoRow.userId))
        .limit(1);

      if (userRow) {
        recipientEmail = userRow.email;
        recipientName = userRow.name || 'Developer';
      }
    }

    if (!recipientEmail) return null;

    // 4. Resolve Org meta if available
    let recipientMeta = `@${repoRow.owner}`;
    if (repoRow.orgId) {
      const [orgRow] = await db
        .select({ githubLogin: organization.githubLogin, planType: organization.planType })
        .from(organization)
        .where(eq(organization.id, repoRow.orgId))
        .limit(1);

      if (orgRow) {
        recipientMeta = `@${orgRow.githubLogin} · ${orgRow.planType.toUpperCase()}`;
      }
    }

    // 5. Fetch all Agent Tasks for this run
    const tasks = await db
      .select({
        agentId: agentTasks.agentId,
        status: agentTasks.status,
        score: agentTasks.score,
        findingsCount: agentTasks.findingsCount,
        durationMs: agentTasks.duration,
        findings: agentTasks.findings,
        error: agentTasks.error,
      })
      .from(agentTasks)
      .where(eq(agentTasks.runId, runId))
      .orderBy(desc(agentTasks.duration));

    // 6. Extract Critical Findings from all tasks
    const criticalFindings: Array<{
      severity: string;
      category: string;
      title: string;
      file?: string;
      line?: number;
    }> = [];

    for (const t of tasks) {
      if (Array.isArray(t.findings)) {
        for (const f of t.findings as any[]) {
          if (f && (f.severity === 'critical' || f.severity === 'high')) {
            criticalFindings.push({
              severity: f.severity,
              category: f.category || t.agentId,
              title: f.title || 'Vulnerability detected',
              file: f.file,
              line: f.line,
            });
          }
        }
      }
    }

    // 7. Check if Auto-Fix PR was created
    const [approval] = await db
      .select({
        prUrl: mergeApprovals.prUrl,
        prTitle: mergeApprovals.prTitle,
        verdict: mergeApprovals.guardianVerdict,
      })
      .from(mergeApprovals)
      .where(eq(mergeApprovals.runId, runId))
      .limit(1);

    // 8. Gate decision heuristic
    const score = runRow.score ?? 0;
    let gateDecision: 'PASS' | 'WARN' | 'BLOCK' = 'PASS';
    if (score < 60 || criticalFindings.some(f => f.severity === 'critical')) {
      gateDecision = 'BLOCK';
    } else if (score < 85 || criticalFindings.length > 0) {
      gateDecision = 'WARN';
    }

    // 9. Sanitize log tail
    const logTail = sanitizeTerminalLogs(runRow.rawLogs || tasks.find(t => t.error)?.error || '', 14);

    return {
      recipientEmail,
      recipientName,
      recipientMeta,
      repoName: repoRow.fullName,
      prNumber: runRow.prNumber,
      commitSha: runRow.commitSha,
      gateDecision,
      overallScore: score,
      tasks: tasks.map(t => ({
        agentId: t.agentId,
        status: t.status,
        score: t.score,
        findingsCount: t.findingsCount,
        durationMs: t.durationMs,
      })),
      criticalFindings,
      autoFixPrUrl: approval?.prUrl ?? null,
      logTail,
      dashboardUrl: `${frontendUrl}/dashboard/runs/${runId}`,
      prGithubUrl: runRow.prNumber ? `https://github.com/${repoRow.fullName}/pull/${runRow.prNumber}` : undefined,
    };
  }
}
