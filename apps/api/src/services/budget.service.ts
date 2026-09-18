/**
 * ============================================================================
 * Budget Sentinel Service
 * ============================================================================
 *
 * Two-tier protection against runaway costs:
 *
 *  Tier 1 — Global Monthly Budget (Redis-cached, 5-min TTL)
 *    - Aggregates LLM spend from agentTasks.tokenUsage
 *    - Redis caches the result so the hot path never hits Postgres
 *    - Emergency kill switch overrides everything
 *
 *  Tier 2 — Per-Org PR Scan Quota (Postgres atomic gate)
 *    - Free tier:  10 distinct PR numbers, LIFETIME (never resets)
 *    - Pro tier:   100 distinct PR numbers per billing period
 *    - Team tier:  Unlimited
 *
 *  Critical design: "distinct PR number" semantics.
 *  Force-pushing to PR #42 five times counts as ONE scan, not five.
 *  The gate checks whether this PR number has already been scanned for
 *  the org BEFORE counting — handled atomically with SELECT FOR UPDATE.
 * ============================================================================
 */

import { db } from '../db/index.js';
import { agentTasks, organization, repositories, runs } from '../db/schema.js';
import { eq, and, sql, gte, lt } from 'drizzle-orm';
import { createRedisConnection } from '../lib/redis.js';
import { appConfig } from '../config/app.config.js';

// ─── Redis client (lazy singleton) ──────────────────────────────────────────
let _redis: ReturnType<typeof createRedisConnection> | null = null;
function getRedis() {
  if (!_redis) _redis = createRedisConnection();
  return _redis;
}

const BUDGET_CACHE_KEY = 'budget:monthly_spend_usd';

// ─── Model Cost Table (per 1M tokens) ───────────────────────────────────────
// Branch order matters: every test is a substring match, so the MOST SPECIFIC model id must
// be checked first. A generic `m.includes('mini')` ahead of `gpt-4o-mini` previously swallowed
// the most-used model in the fleet and billed it at Haiku rates ($0.25/$1.25 instead of
// $0.15/$0.60), making the gpt-4o-mini branch unreachable and over-stating real spend.
//
// `cachedInput` is the portion of input served from the provider's prompt cache. Providers
// discount it heavily (OpenAI bills cached input at ~50% for the 4o family), and measured runs
// on this system cache 78-85% of their input, so ignoring it materially over-states spend and
// trips the kill switch early.
// Tokens WRITTEN to the prompt cache bill above the standard input rate — 1.25x on Anthropic
// models for the default 5-minute TTL. Kept as a multiplier rather than a fourth column so the
// rate table stays a single source of truth per model.
const CACHE_WRITE_MULTIPLIER = 1.25;

function getModelRates(model: string): { input: number; output: number; cachedInput: number } {
  const m = (model || '').toLowerCase();
  if (m.includes('free') || m.includes('glm') || m.includes('deepseek-r1:free')) {
    return { input: 0, output: 0, cachedInput: 0 };
  }
  // Amazon Nova — the Bedrock availability fallback. Without these branches every Nova run fell
  // through to the default Sonnet rate ($3/$15), over-stating a nova-micro call by ~85x and
  // tripping the monthly kill switch on traffic that is nearly free. Bedrock on-demand rates.
  if (m.includes('nova-micro')) {
    return { input: 0.035, output: 0.14, cachedInput: 0.0035 };
  }
  if (m.includes('nova-lite')) {
    return { input: 0.06, output: 0.24, cachedInput: 0.006 };
  }
  if (m.includes('nova-pro')) {
    return { input: 0.8, output: 3.2, cachedInput: 0.08 };
  }
  if (m.includes('gemini-flash') || m.includes('gemini-1.5-flash')) {
    return { input: 0.075, output: 0.3, cachedInput: 0.01875 };
  }
  // Most specific first.
  if (m.includes('gpt-4o-mini')) {
    return { input: 0.15, output: 0.6, cachedInput: 0.075 };
  }
  if (m.includes('gpt-4o')) {
    return { input: 2.5, output: 10.0, cachedInput: 1.25 };
  }
  // Current-generation Claude, matched before the generic `haiku` / `sonnet` catch-alls below.
  // Those catch-alls were written when the fleet was Claude 3.x and silently mis-price every
  // model added since: `claude-haiku-4-5` fell into the 3-Haiku branch ($0.25 vs $1.00, a 4x
  // under-count) and `claude-opus-5` fell all the way through to the Sonnet default ($3 vs $5).
  // A kill switch that under-counts is a kill switch that fires too late.
  // Rates are Anthropic's published per-MTok prices; Bedrock is partner-operated and priced
  // separately, so treat these as the close-but-not-authoritative figures they are.
  if (m.includes('claude-fable-5') || m.includes('claude-mythos')) {
    return { input: 10.0, output: 50.0, cachedInput: 1.0 };
  }
  if (m.includes('claude-opus-5') || m.includes('claude-opus-4-')) {
    return { input: 5.0, output: 25.0, cachedInput: 0.5 };
  }
  if (m.includes('claude-sonnet-5')) {
    return { input: 2.0, output: 10.0, cachedInput: 0.2 };
  }
  if (m.includes('claude-sonnet-4-')) {
    return { input: 3.0, output: 15.0, cachedInput: 0.3 };
  }
  if (m.includes('claude-haiku-4-5')) {
    return { input: 1.0, output: 5.0, cachedInput: 0.1 };
  }
  if (m.includes('claude-3-haiku')) {
    return { input: 0.25, output: 1.25, cachedInput: 0.03 };
  }
  if (m.includes('mini') || m.includes('haiku')) {
    return { input: 0.25, output: 1.25, cachedInput: 0.03 };
  }
  if (m.includes('claude-3-7') || m.includes('claude-3.7')) {
    return { input: 3.0, output: 15.0, cachedInput: 0.3 };
  }
  if (m.includes('claude-3-5') || m.includes('claude-3.5') || m.includes('sonnet')) {
    return { input: 3.0, output: 15.0, cachedInput: 0.3 };
  }
  if (m.includes('gemini-pro') || m.includes('gemini-1.5-pro')) {
    return { input: 1.25, output: 5.0, cachedInput: 0.3125 };
  }
  // Default: Claude Sonnet rate (safe over-estimate)
  return { input: 3.0, output: 15.0, cachedInput: 0.3 };
}

// ─── Compute current month's LLM spend from Postgres ────────────────────────
async function computeMonthlySpend(): Promise<number> {
  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);

  const tasks = await db
    .select({
      model: agentTasks.model,
      tokenUsage: agentTasks.tokenUsage,
    })
    .from(agentTasks)
    .where(gte(agentTasks.completedAt, firstDayOfMonth));

  let totalCost = 0;
  for (const t of tasks) {
    const usage = (t.tokenUsage as any) || {};
    const inputTokens  = Number(usage.input  ?? usage.promptTokens     ?? 0) || 0;
    const outputTokens = Number(usage.output ?? usage.completionTokens ?? 0) || 0;
    // `input` is the TOTAL input for the step; cachedInput (cache reads) and cacheWriteInput
    // (cache writes) are both SUBSETS of it, never additions. Bedrock natively reports the three
    // figures disjointly — its own `inputTokens` excludes the cached portions entirely — so
    // bedrock.provider.ts sums them back up before handing usage over, precisely so this
    // subset invariant holds for every provider.
    //
    // The three tiers price very differently: reads are ~10% of the input rate, writes are 125%
    // of it. Folding writes into the uncached remainder under-charged them by a quarter; folding
    // them into reads under-charged them by an order of magnitude.
    //
    // Every term is clamped so a malformed row can never produce negative spend and mask real
    // usage from the kill switch.
    const cachedTokens = Math.min(Number(usage.cachedInput ?? 0) || 0, inputTokens);
    const cacheWriteTokens = Math.min(
      Number(usage.cacheWriteInput ?? 0) || 0,
      Math.max(0, inputTokens - cachedTokens),
    );
    const uncachedTokens = Math.max(0, inputTokens - cachedTokens - cacheWriteTokens);
    const rates = getModelRates(t.model ?? '');
    totalCost += (uncachedTokens   / 1_000_000) * rates.input
               + (cachedTokens     / 1_000_000) * rates.cachedInput
               + (cacheWriteTokens / 1_000_000) * (rates.input * CACHE_WRITE_MULTIPLIER)
               + (outputTokens     / 1_000_000) * rates.output;
  }

  return totalCost;
}

export class BudgetService {
  // ────────────────────────────────────────────────────────────────────────────
  // TIER 1 — Global Monthly Budget
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Fast check: is the global monthly budget still OK?
   *
   * Hot path: reads from Redis cache (< 1ms).
   * Cold path (cache miss): queries Postgres, writes cache with TTL.
   *
   * @returns true  → scan is allowed
   *          false → scan is blocked (budget exceeded or kill switch active)
   */
  static async checkGlobalBudget(): Promise<boolean> {
    try {
      // Kill switch: re-read from process.env at call time (not module-load time)
      // so an operator can flip GLOBAL_KILL_SWITCH=true and have it take effect
      // on the very next webhook without restarting the process.
      const killSwitchActive =
        process.env.GLOBAL_KILL_SWITCH === 'true' ||
        process.env.EMERGENCY_KILL_SWITCH === 'true';
      if (killSwitchActive) {
        console.error('[BUDGET SENTINEL] EMERGENCY KILL SWITCH IS ACTIVE. Admission blocked.');
        return false;
      }

      const redis = getRedis();
      let monthlySpend: number;

      // Try cache first
      const cached = await redis.get(BUDGET_CACHE_KEY).catch(() => null);
      if (cached !== null) {
        monthlySpend = Number(cached);
      } else {
        // Cache miss — hit Postgres and backfill cache
        monthlySpend = await computeMonthlySpend();
        await redis
          .set(BUDGET_CACHE_KEY, monthlySpend.toFixed(4), 'EX', appConfig.budget.cacheTtlSeconds)
          .catch(() => {}); // cache failure is non-fatal
      }

      const limit = appConfig.budget.monthlyLimitUsd;
      if (monthlySpend > limit) {
        console.error(
          `[BUDGET SENTINEL] CRITICAL: Monthly spend $${monthlySpend.toFixed(2)} ` +
          `exceeds limit $${limit.toFixed(2)}. All scans blocked.`
        );
        return false;
      }

      console.log(`[BUDGET SENTINEL] Monthly spend: $${monthlySpend.toFixed(2)} / $${limit.toFixed(2)}`);
      return true;
    } catch (err) {
      // Fail open on unexpected error — log loudly but don't drop the event.
      console.error('[BUDGET SENTINEL] Error checking global budget (failing open):', err);
      return true;
    }
  }

  /**
   * Invalidates the Redis budget cache.
   * Call this after agent tasks complete so the next check re-computes.
   */
  static async invalidateBudgetCache(): Promise<void> {
    try {
      await getRedis().del(BUDGET_CACHE_KEY);
    } catch {
      // non-fatal
    }
  }

  /**
   * Returns sentinel status for admin dashboards.
   */
  static async getSentinelStatus(): Promise<{
    allowed: boolean;
    killSwitchActive: boolean;
    monthlySpendUsd: number;
    monthlyLimitUsd: number;
    fromCache: boolean;
  }> {
    const killSwitchActive = appConfig.budget.killSwitch;
    const limit = appConfig.budget.monthlyLimitUsd;
    const redis = getRedis();

    let monthlySpend: number;
    let fromCache = false;

    const cached = await redis.get(BUDGET_CACHE_KEY).catch(() => null);
    if (cached !== null) {
      monthlySpend = Number(cached);
      fromCache = true;
    } else {
      monthlySpend = await computeMonthlySpend();
    }

    return {
      allowed: !killSwitchActive && monthlySpend <= limit,
      killSwitchActive,
      monthlySpendUsd: Number(monthlySpend.toFixed(2)),
      monthlyLimitUsd: limit,
      fromCache,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TIER 2 — Per-Org PR Quota (Atomic Gate)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Atomically:
   *  1. Locks the org row (FOR UPDATE → prevents concurrent race)
   *  2. Evaluates plan-tier quota
   *  3. For free tier: checks if this exact PR number was already scanned
   *     (force-push de-dup) before consuming a slot
   *  4. Creates the run record inside the same transaction
   *
   * @returns { allowed: true, runRecord }   → proceed with scan
   *          { allowed: false, reason }     → reject, reason tells you why
   */
  static async reserveOrgPrRun(
    orgId: number,
    runData: { repoId: number; commitSha: string; prNumber?: number | null }
  ): Promise<{ allowed: boolean; runRecord?: any; reason?: string }> {
    try {
      return await db.transaction(async (tx) => {
        // Lock the org row for the duration of this transaction.
        // This prevents two concurrent webhooks for the same org from both
        // passing the quota check and both incrementing the counter.
        const [org] = await tx.execute(
          sql`SELECT id, plan_type, pr_quota_limit, trial_prs_used, trial_pr_limit,
                     current_period_start, current_period_end
              FROM organization
              WHERE id = ${orgId}
              FOR UPDATE`
        ) as any[];

        if (!org) {
          // Unknown org — create the run and allow (safety fallback)
          const [runRecord] = await tx.insert(runs).values({
            repoId: runData.repoId,
            commitSha: runData.commitSha,
            status: 'queued',
            prNumber: runData.prNumber ?? null,
          }).returning();
          return { allowed: true, runRecord };
        }

        const planType = ((org.plan_type || 'free') as string).toLowerCase();

        // ── Team tier: unlimited ──────────────────────────────────────────
        if (planType === 'team') {
          const [runRecord] = await tx.insert(runs).values({
            repoId: runData.repoId,
            commitSha: runData.commitSha,
            status: 'queued',
            prNumber: runData.prNumber ?? null,
          }).returning();
          return { allowed: true, runRecord };
        }

        // ── Pro tier: 100 distinct PRs per billing period ─────────────────
        if (planType === 'pro') {
          const quotaLimit = Number(org.pr_quota_limit) || appConfig.billing.proPrLimit;
          const periodStart: Date = org.current_period_start
            ? new Date(org.current_period_start)
            : (() => {
                const d = new Date();
                d.setDate(1); d.setHours(0, 0, 0, 0);
                return d;
              })();

          const [{ distinctCount }] = await tx.execute(
            sql`SELECT COUNT(DISTINCT r.pr_number)::int AS "distinctCount"
                FROM runs r
                INNER JOIN repositories repo ON r.repo_id = repo.id
                WHERE repo.org_id    = ${orgId}
                  AND r.pr_number   IS NOT NULL
                  AND r.created_at  >= ${periodStart}`
          ) as any[];

          const used = Number(distinctCount || 0);
          if (used >= quotaLimit) {
            console.warn(
              `[BUDGET SENTINEL] Org ${orgId} (pro) hit PR limit: ${used}/${quotaLimit} this period.`
            );
            return { allowed: false, reason: 'pro_plan_pr_limit_exceeded' };
          }

          const [runRecord] = await tx.insert(runs).values({
            repoId: runData.repoId,
            commitSha: runData.commitSha,
            status: 'queued',
            prNumber: runData.prNumber ?? null,
          }).returning();
          return { allowed: true, runRecord };
        }

        // ── Free tier: lifetime 10 distinct PRs ───────────────────────────
        const trialLimit = Number(org.trial_pr_limit) || appConfig.billing.trialPrLimit;
        const trialUsed  = Number(org.trial_prs_used) || 0;
        const prNumber   = runData.prNumber ?? null;

        // If this exact PR number has already been scanned for this org,
        // allow the force-push without consuming a new slot.
        if (prNumber !== null) {
          const [{ alreadyScanned }] = await tx.execute(
            sql`SELECT COUNT(*)::int > 0 AS "alreadyScanned"
                FROM runs r
                INNER JOIN repositories repo ON r.repo_id = repo.id
                WHERE repo.org_id  = ${orgId}
                  AND r.pr_number  = ${prNumber}`
          ) as any[];

          if (alreadyScanned) {
            // Same PR, different push — allow without incrementing counter
            const [runRecord] = await tx.insert(runs).values({
              repoId: runData.repoId,
              commitSha: runData.commitSha,
              status: 'queued',
              prNumber,
            }).returning();
            return { allowed: true, runRecord };
          }
        }

        // New PR number — check quota
        if (trialUsed >= trialLimit) {
          console.warn(
            `[BUDGET SENTINEL] Org ${orgId} (free) trial exhausted: ` +
            `${trialUsed}/${trialLimit} lifetime PR slots used.`
          );
          return { allowed: false, reason: 'free_trial_exhausted' };
        }

        // Consume one slot and create the run atomically
        await tx.execute(
          sql`UPDATE organization SET trial_prs_used = trial_prs_used + 1 WHERE id = ${orgId}`
        );

        const [runRecord] = await tx.insert(runs).values({
          repoId: runData.repoId,
          commitSha: runData.commitSha,
          status: 'queued',
          prNumber,
        }).returning();

        console.log(
          `[BUDGET SENTINEL] Org ${orgId} (free) consumed PR slot ` +
          `${trialUsed + 1}/${trialLimit} for PR #${prNumber}.`
        );
        return { allowed: true, runRecord };
      });
    } catch (err) {
      console.error(`[BUDGET SENTINEL] Unexpected transaction error for org ${orgId}:`, err);
      // Fail-open ONLY on unexpected infrastructure errors (DB connection lost, etc.).
      // Quota exhaustion is handled above and never reaches this catch block.
      // This keeps the system available when Postgres hiccups, without bypassing quota.
      const [runRecord] = await db.insert(runs).values({
        repoId: runData.repoId,
        commitSha: runData.commitSha,
        status: 'queued',
        prNumber: runData.prNumber ?? null,
      }).returning();
      return { allowed: true, runRecord };
    }
  }

  /**
   * Returns how many trial PR slots an org has used (for dashboard display).
   */
  static async getOrgTrialStatus(orgId: number): Promise<{
    planType: string;
    trialPrsUsed: number;
    trialPrLimit: number;
    trialExhausted: boolean;
  } | null> {
    const [org] = await db
      .select({
        planType: organization.planType,
        trialPrsUsed: organization.trialPrsUsed,
        trialPrLimit: organization.trialPrLimit,
      })
      .from(organization)
      .where(eq(organization.id, orgId));

    if (!org) return null;
    return {
      planType: org.planType,
      trialPrsUsed: org.trialPrsUsed,
      trialPrLimit: org.trialPrLimit,
      trialExhausted: org.trialPrsUsed >= org.trialPrLimit,
    };
  }
}
