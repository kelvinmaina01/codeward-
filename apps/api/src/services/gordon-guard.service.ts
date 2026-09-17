import { db } from '../db/index.js';
import { organization, organizationMember, repositories, runs } from '../db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import { createRedisConnection, isRedisQuotaExceeded } from '../lib/redis.js';

const redis = createRedisConnection();

export interface GordonQuotaStatus {
  allowed: boolean;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  dailyLimit: number;
  dailyRemaining: number;
  dailyUsed: number;
  retryAfterSeconds?: number;
  reason?: 'velocity_exceeded' | 'daily_quota_exceeded';
  message?: string;
}

const PLAN_LIMITS = {
  free: {
    dailyLimit: 3,        // strictly 3 prompts/day for free users to prevent token burning
    velocityLimit: 2,     // max 2 requests per 60s
    velocityWindowSec: 60,
  },
  pro: {
    dailyLimit: 200,
    velocityLimit: 20,    // max 20 requests per 60s
    velocityWindowSec: 60,
  },
  team: {
    dailyLimit: 1000,
    velocityLimit: 40,
    velocityWindowSec: 60,
  },
  enterprise: {
    dailyLimit: 5000,
    velocityLimit: 60,
    velocityWindowSec: 60,
  },
} as const;

export class GordonGuardService {
  /**
   * Resolves the user's active billing plan from the database.
   */
  static async getUserPlan(userId: string): Promise<'free' | 'pro' | 'team' | 'enterprise'> {
    try {
      const [membership] = await db
        .select({ planType: organization.planType })
        .from(organizationMember)
        .innerJoin(organization, eq(organizationMember.orgId, organization.id))
        .where(eq(organizationMember.userId, userId))
        .limit(1);

      const plan = membership?.planType?.toLowerCase();
      if (plan === 'pro') return 'pro';
      if (plan === 'team') return 'team';
      if (plan === 'enterprise') return 'enterprise';
      return 'free';
    } catch (err) {
      console.warn('[GordonGuard] Error resolving user plan, defaulting to free:', err);
      return 'free';
    }
  }

  /**
   * Checks rate limiting and token consumption quota.
   * Returns whether the request is allowed, along with remaining quota metadata.
   */
  static async checkQuota(userId: string): Promise<GordonQuotaStatus> {
    const plan = await this.getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    // In-memory fallback if Redis is down or quota exceeded
    if (isRedisQuotaExceeded()) {
      return {
        allowed: true,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining: limits.dailyLimit,
        dailyUsed: 0,
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const velocityKey = `gordon:velocity:${userId}`;
      const dailyKey = `gordon:quota:daily:${userId}:${today}`;

      // 1. Check velocity (sliding window)
      const currentVelocity = await redis.incr(velocityKey);
      if (currentVelocity === 1) {
        await redis.expire(velocityKey, limits.velocityWindowSec);
      }

      if (currentVelocity > limits.velocityLimit) {
        const ttl = await redis.ttl(velocityKey);
        return {
          allowed: false,
          plan,
          dailyLimit: limits.dailyLimit,
          dailyRemaining: 0,
          dailyUsed: limits.dailyLimit,
          retryAfterSeconds: Math.max(1, ttl),
          reason: 'velocity_exceeded',
          message: `You're prompting Gordon too quickly! Please wait ${Math.max(1, ttl)}s before sending another message.`,
        };
      }

      // 2. Check daily prompt count
      const rawCount = await redis.get(dailyKey);
      const dailyUsed = rawCount ? parseInt(rawCount, 10) : 0;

      if (dailyUsed >= limits.dailyLimit) {
        return {
          allowed: false,
          plan,
          dailyLimit: limits.dailyLimit,
          dailyRemaining: 0,
          dailyUsed,
          reason: 'daily_quota_exceeded',
          message: plan === 'free'
            ? `You have reached your daily Gordon AI prompt limit for the Free plan (${limits.dailyLimit}/${limits.dailyLimit} messages). Upgrade to Pro for 200 prompts/day and prioritized agent execution.`
            : `You have reached your daily Gordon AI prompt limit (${limits.dailyLimit}/${limits.dailyLimit} messages). Limit resets at midnight UTC.`,
        };
      }

      // Increment daily count with 48h TTL
      const newDailyUsed = await redis.incr(dailyKey);
      if (newDailyUsed === 1) {
        await redis.expire(dailyKey, 172800); // 48 hours
      }

      const dailyRemaining = Math.max(0, limits.dailyLimit - newDailyUsed);

      return {
        allowed: true,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining,
        dailyUsed: newDailyUsed,
      };
    } catch (err) {
      console.error('[GordonGuard] Error checking quota in Redis, allowing gracefully:', err);
      return {
        allowed: true,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining: limits.dailyLimit,
        dailyUsed: 0,
      };
    }
  }

  /**
   * Retrieves the current quota status without incrementing counts (read-only query).
   */
  static async getQuotaStatus(userId: string): Promise<GordonQuotaStatus> {
    const plan = await this.getUserPlan(userId);
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    if (isRedisQuotaExceeded()) {
      return {
        allowed: true,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining: limits.dailyLimit,
        dailyUsed: 0,
      };
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const dailyKey = `gordon:quota:daily:${userId}:${today}`;
      const rawCount = await redis.get(dailyKey);
      const dailyUsed = rawCount ? parseInt(rawCount, 10) : 0;
      const dailyRemaining = Math.max(0, limits.dailyLimit - dailyUsed);

      return {
        allowed: dailyRemaining > 0,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining,
        dailyUsed,
      };
    } catch (err) {
      return {
        allowed: true,
        plan,
        dailyLimit: limits.dailyLimit,
        dailyRemaining: limits.dailyLimit,
        dailyUsed: 0,
      };
    }
  }

  /**
   * Sanitizes and prunes conversation messages before passing to the LLM.
   * - Restricts context to the last 8 messages.
   * - Truncates old tool inputs and outputs to prevent token ballooning.
   */
  static pruneContextMessages(messages: any[], maxRecentMessages = 8): any[] {
    if (!Array.isArray(messages) || messages.length === 0) return [];

    // Keep the most recent N messages
    const recent = messages.slice(-maxRecentMessages);

    return recent.map((msg, index) => {
      // Don't truncate the very last message (current user turn)
      const isLatest = index === recent.length - 1;
      if (isLatest || !Array.isArray(msg.parts)) return msg;

      const sanitizedParts = msg.parts.map((part: any) => {
        // Truncate verbose tool results in past turns to save thousands of tokens
        if (part.type === 'tool-invocation' || part.toolName) {
          const resultStr = typeof part.result === 'string' 
            ? part.result 
            : JSON.stringify(part.result ?? '');

          if (resultStr && resultStr.length > 1200) {
            return {
              ...part,
              result: resultStr.slice(0, 1200) + '... [truncated for context efficiency]',
            };
          }
        }
        return part;
      });

      return {
        ...msg,
        parts: sanitizedParts,
      };
    });
  }

  /**
   * Fast cache helper for suggestions.
   */
  static async getCachedSuggestions(userId: string): Promise<any[] | null> {
    try {
      const cached = await redis.get(`gordon:suggestions:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
    return null;
  }

  static async setCachedSuggestions(userId: string, suggestions: any[]): Promise<void> {
    try {
      await redis.set(`gordon:suggestions:${userId}`, JSON.stringify(suggestions), 'EX', 60);
    } catch {}
  }
}
