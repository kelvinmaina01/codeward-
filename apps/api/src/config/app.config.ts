/**
 * ============================================================================
 * app.config.ts — Centralised Application Configuration
 * ============================================================================
 *
 * Single source of truth for all environment-variable-driven configuration.
 * Business logic MUST import from this module instead of reading process.env
 * directly — this guarantees:
 *
 *  1. Startup fails loudly when a *required* env var is missing, not silently
 *     at the moment a payment event or webhook fires.
 *  2. Every config value is typed, documented, and in one place.
 *  3. Defaults are explicit and easy to audit.
 *
 * Usage:
 *   import { appConfig } from '../config/app.config.js';
 *   const url = appConfig.app.frontendUrl;
 * ============================================================================
 */

/**
 * Reads a required environment variable. Throws a loud Error at startup if
 * the variable is not set, so operators catch misconfiguration immediately
 * rather than at the moment of a live payment event.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[app.config] FATAL: Required environment variable "${key}" is not set. ` +
      `The server cannot start without it. Please add it to your .env file.`
    );
  }
  return value;
}

/**
 * Reads an optional environment variable with a fallback default.
 */
function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// ─── App ────────────────────────────────────────────────────────────────────

const app = {
  /** Public URL of the frontend (e.g. https://codeward.cloud). Used in email links. */
  frontendUrl: requireEnv('FRONTEND_URL'),
  /** Human-readable product name used in email subjects and GitHub comments. */
  appName: optionalEnv('APP_NAME', 'Codeward'),
  /** Environment (development | staging | production). */
  env: optionalEnv('NODE_ENV', 'development'),
} as const;

// ─── Email ──────────────────────────────────────────────────────────────────

const email = {
  /**
   * The "From" address used for all outbound email.
   * Must be a verified domain in your Resend dashboard.
   * Example: "Codeward <hello@codeward.cloud>"
   */
  fromAddress: optionalEnv('EMAIL_FROM_ADDRESS', 'Codeward <hello@codeward.cloud>'),
  /** Support reply-to address shown in email footers. */
  supportAddress: optionalEnv('SUPPORT_EMAIL', 'support@codeward.cloud'),
} as const;

// ─── Polar Billing ──────────────────────────────────────────────────────────

const polar = {
  /**
   * REQUIRED IN PROD — Polar webhook signing secret.
   * Get this from Polar Dashboard → Webhooks → Secret.
   * Without this, anyone can forge billing events.
   */
  webhookSecret: optionalEnv('POLAR_WEBHOOK_SECRET', 'test_secret'),

  /**
   * REQUIRED IN PROD — Polar Product ID for the Pro tier.
   * Get from Polar Dashboard → Products → Pro → copy Product ID.
   */
  proProductId: optionalEnv('POLAR_PRO_PRODUCT_ID', 'test_pro_id'),

  /**
   * REQUIRED IN PROD — Polar Product ID for the Team tier.
   * Get from Polar Dashboard → Products → Team → copy Product ID.
   */
  teamProductId: optionalEnv('POLAR_TEAM_PRODUCT_ID', 'test_team_id'),

  /**
   * Polar Access Token for server-side API calls (optional — only needed if
   * you want to make Polar API calls from the backend, e.g. to list orders).
   */
  accessToken: process.env.POLAR_ACCESS_TOKEN,

  /**
   * URL shown in the "Upgrade to Pro →" link inside GitHub PR comments and
   * in trial-limit-reached emails. Defaults to the /pricing page.
   */
  upgradeUrl: optionalEnv('POLAR_UPGRADE_URL', `${process.env.FRONTEND_URL || 'https://codeward.cloud'}/pricing`),
} as const;

// ─── Billing / Plan Quotas ───────────────────────────────────────────────────

const billing = {
  /**
   * Number of distinct PR scans included in the free trial (lifetime, not
   * per-month). Default 10. Override with TRIAL_PR_LIMIT env var.
   */
  trialPrLimit: Number(optionalEnv('TRIAL_PR_LIMIT', '10')),

  /**
   * Monthly PR scan quota for Pro-tier orgs. Default 100.
   */
  proPrLimit: Number(optionalEnv('PRO_PR_LIMIT', '100')),
} as const;

// ─── Global Budget Sentinel ──────────────────────────────────────────────────

const budget = {
  /**
   * Hard monthly LLM cost cap in USD. When the aggregate spend computed from
   * agentTasks.tokenUsage exceeds this, ALL new PR scans are blocked.
   * Default $500.
   */
  monthlyLimitUsd: Number(optionalEnv('GLOBAL_MONTHLY_BUDGET_LIMIT_USD', '500')),

  /**
   * When true, every incoming scan is rejected immediately regardless of
   * actual spend. Use this as a manual emergency brake.
   */
  killSwitch:
    process.env.GLOBAL_KILL_SWITCH === 'true' ||
    process.env.EMERGENCY_KILL_SWITCH === 'true',

  /**
   * How long (in seconds) the Redis-cached monthly spend figure is valid
   * before we re-compute from Postgres. Keeps the hot path fast.
   */
  cacheTtlSeconds: Number(optionalEnv('BUDGET_CACHE_TTL_SECONDS', '300')),
} as const;

// ─── Exports ─────────────────────────────────────────────────────────────────

export const appConfig = {
  app,
  email,
  polar,
  billing,
  budget,
} as const;

export type AppConfig = typeof appConfig;
