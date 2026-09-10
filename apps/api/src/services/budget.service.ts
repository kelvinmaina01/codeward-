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
      const budgetLimit = parseFloat(budgetLimitStr);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // We sum up the token usage from agentTasks where completedAt >= firstDayOfMonth
      // The tokenUsage is a JSONB object looking like: { promptTokens: 1234, completionTokens: 567 }
      const rows = await db
        .select({
          promptTokens: sql<number>`SUM(CAST(${agentTasks.tokenUsage}->>'promptTokens' AS integer))`,
          completionTokens: sql<number>`SUM(CAST(${agentTasks.tokenUsage}->>'completionTokens' AS integer))`
        })
        .from(agentTasks)
        .where(gte(agentTasks.completedAt, firstDayOfMonth));

      const row = rows[0];
      const promptTokens = row?.promptTokens || 0;
      const completionTokens = row?.completionTokens || 0;

      const inputCost = (promptTokens / 1_000_000) * CLAUDE_INPUT_COST_PER_MILLION;
      const outputCost = (completionTokens / 1_000_000) * CLAUDE_OUTPUT_COST_PER_MILLION;
      const totalCost = inputCost + outputCost;

      if (totalCost > budgetLimit) {
        console.error(`[BUDGET SENTINEL] CRITICAL: Global monthly budget exceeded! Cost: $${totalCost.toFixed(2)} (Limit: $${budgetLimit.toFixed(2)})`);
        return false;
      }

      console.log(`[BUDGET SENTINEL] Current monthly cost: $${totalCost.toFixed(2)} / $${budgetLimit.toFixed(2)}`);
      return true;
    } catch (err) {
      console.error('[BUDGET SENTINEL] Error checking global budget:', err);
      // In case of an error evaluating budget, we allow the run but log an error.
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
}
