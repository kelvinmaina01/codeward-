import { db } from '../db/index.js';
import { agentTasks, organization, repositories, runs } from '../db/schema.js';
import { eq, and, sql, gte } from 'drizzle-orm';

/**
 * Anthropic Cost Estimates:
 * Claude 3.5 Sonnet: ~$3 / 1M input tokens, ~$15 / 1M output tokens
 */
const CLAUDE_INPUT_COST_PER_MILLION = 3.0;
const CLAUDE_OUTPUT_COST_PER_MILLION = 15.0;

export class BudgetService {
  /**
   * Checks if the global monthly budget has been exceeded.
   * Default limit is $500 USD unless GLOBAL_MONTHLY_BUDGET_LIMIT_USD is set.
   */
  static async checkGlobalBudget(): Promise<boolean> {
    try {
      const budgetLimitStr = process.env.GLOBAL_MONTHLY_BUDGET_LIMIT_USD || '500';
      const budgetLimit = Number(budgetLimitStr);
      if (!Number.isFinite(budgetLimit) || budgetLimit < 0) {
        console.error('[BUDGET SENTINEL] Invalid global budget limit configured.');
        return false;
      }

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Load token usage from agentTasks completed this month
      const tasks = await db
        .select({
          provider: agentTasks.provider,
          model: agentTasks.model,
          tokenUsage: agentTasks.tokenUsage,
        })
        .from(agentTasks)
        .where(gte(agentTasks.completedAt, firstDayOfMonth));

      let totalCost = 0;
      for (const t of tasks) {
        const usage = (t.tokenUsage as any) || {};
        const inputTokens = Number(usage.input ?? usage.promptTokens ?? 0) || 0;
        const outputTokens = Number(usage.output ?? usage.completionTokens ?? 0) || 0;

        const model = (t.model || '').toLowerCase();
        let inputRate = 3.0; // Default Claude/general rate per 1M
        let outputRate = 15.0;

        if (model.includes('free') || model.includes('glm') || model.includes('deepseek')) {
          inputRate = 0.0;
          outputRate = 0.0;
        } else if (model.includes('mini') || model.includes('flash')) {
          inputRate = 0.15;
          outputRate = 0.60;
        } else if (model.includes('gpt-4o')) {
          inputRate = 2.50;
          outputRate = 10.0;
        }

        totalCost += (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
      }

      if (totalCost > budgetLimit) {
        console.error(`[BUDGET SENTINEL] CRITICAL: Global monthly budget exceeded! Cost: $${totalCost.toFixed(2)} (Limit: $${budgetLimit.toFixed(2)})`);
        return false;
      }

      console.log(`[BUDGET SENTINEL] Current monthly cost: $${totalCost.toFixed(2)} / $${budgetLimit.toFixed(2)}`);
      return true;
    } catch (err) {
      console.error('[BUDGET SENTINEL] Error checking global budget:', err);
      // In case of an error evaluating budget, allow the run but log an error.
      return true;
    }
  }

  /**
   * Checks if an organization has exceeded its monthly PR scan limit.
   * Free tier: 10 PR scans per month.
   * Pro/Team tiers: Unlimited.
   */
  static async checkOrgPrLimit(orgId: number): Promise<boolean> {
    try {
      const [org] = await db
        .select({ planType: organization.planType })
        .from(organization)
        .where(eq(organization.id, orgId));

      if (!org) return true; // Safety fallback

      // If they are on a paid plan, unlimited scans
      if (org.planType === 'pro' || org.planType === 'team') {
        return true;
      }

      // Free plan logic
      const FREE_TIER_PR_LIMIT = 10;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Count the number of PR runs created this month for this organization
      const countRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(runs)
        .innerJoin(repositories, eq(runs.repoId, repositories.id))
        .where(
          and(
            eq(repositories.orgId, orgId),
            sql`${runs.prNumber} IS NOT NULL`,
            gte(runs.createdAt, firstDayOfMonth)
          )
        );

      const prsThisMonth = Number(countRows[0]?.count || 0);

      if (prsThisMonth >= FREE_TIER_PR_LIMIT) {
        console.warn(`[BUDGET SENTINEL] Org ${orgId} exceeded free tier PR limit (${prsThisMonth}/${FREE_TIER_PR_LIMIT}). Rejecting scan.`);
        return false;
      }

      return true;
    } catch (err) {
      console.error(`[BUDGET SENTINEL] Error checking org PR limit for org ${orgId}:`, err);
      return true;
    }
  }

  /**
   * Atomically checks organization PR limits and creates the run record in a single transaction.
   */
  static async reserveOrgPrRun(orgId: number, runData: { repoId: number; commitSha: string; prNumber?: number | null }): Promise<{ allowed: boolean; runRecord?: any }> {
    try {
      return await db.transaction(async (tx) => {
        const [org] = await tx
          .select({ planType: organization.planType })
          .from(organization)
          .where(eq(organization.id, orgId));

        const isPaid = org && (org.planType === 'pro' || org.planType === 'team');
        if (!isPaid) {
          const FREE_TIER_PR_LIMIT = 10;
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const countRows = await tx
            .select({ count: sql<number>`count(*)` })
            .from(runs)
            .innerJoin(repositories, eq(runs.repoId, repositories.id))
            .where(
              and(
                eq(repositories.orgId, orgId),
                sql`${runs.prNumber} IS NOT NULL`,
                gte(runs.createdAt, firstDayOfMonth)
              )
            );

          const prsThisMonth = Number(countRows[0]?.count || 0);
          if (prsThisMonth >= FREE_TIER_PR_LIMIT) {
            console.warn(`[BUDGET SENTINEL] Org ${orgId} exceeded free tier PR limit (${prsThisMonth}/${FREE_TIER_PR_LIMIT}). Rejecting scan.`);
            return { allowed: false };
          }
        }

        const [runRecord] = await tx.insert(runs).values({
          repoId: runData.repoId,
          commitSha: runData.commitSha,
          status: 'queued',
          prNumber: runData.prNumber ?? null,
        }).returning();

        return { allowed: true, runRecord };
      });
    } catch (err) {
      console.error(`[BUDGET SENTINEL] Error reserving PR run for org ${orgId}:`, err);
      const [runRecord] = await db.insert(runs).values({
        repoId: runData.repoId,
        commitSha: runData.commitSha,
        status: 'queued',
        prNumber: runData.prNumber ?? null,
      }).returning();
      return { allowed: true, runRecord };
    }
  }
}
