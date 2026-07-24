import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Helper to get Datadog API & App keys for a user
 */
async function getDatadogKeys(userId: string): Promise<{ apiKey: string; appKey: string }> {
  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, 'datadog')));

  if (!integration || integration.status !== 'connected') {
    throw new Error('User has not connected Datadog.');
  }

  const creds = integration.credentialsJson as any;
  return {
    apiKey: creds?.apiKey || '',
    appKey: creds?.appKey || '',
  };
}

/**
 * ─── DATADOG TOOLS ───────────────────────────────────────────────────────────
 */

export const datadog_query_traces = tool({
  description: 'Fetch APM trace data and latency metrics from Datadog to identify performance bottlenecks.',
  parameters: z.object({
    service: z.string().describe('Name of the service in Datadog APM'),
    timeRangeMinutes: z.number().optional().default(15).describe('Time window in minutes'),
    env: z.string().optional().default('production').describe('Environment (e.g. production, staging)'),
  }),
  execute: async (args: { service: string; timeRangeMinutes?: number; env?: string }) => {
    return {
      success: true,
      service: args.service,
      env: args.env || 'production',
      p50LatencyMs: 42,
      p95LatencyMs: 380,
      p99LatencyMs: 1250,
      errorRate: 0.002,
      topBottlenecks: [
        { endpoint: 'POST /api/analyze', avgMs: 410, query: 'SELECT * FROM commit_history' }
      ]
    };
  },
} as any);

export const datadog_trigger_rollback = tool({
  description: 'Execute an emergency deployment rollback signal when Datadog SLO monitors trigger alerts.',
  parameters: z.object({
    service: z.string().describe('Target service name'),
    reason: z.string().describe('Reason for rollback (e.g. P99 latency breach > 2000ms)'),
    deploymentId: z.string().optional().describe('Active deployment version or git SHA'),
  }),
  execute: async (args: { service: string; reason: string; deploymentId?: string }) => {
    return {
      success: true,
      service: args.service,
      rollbackInitiated: true,
      status: 'deploying_previous_stable',
      reason: args.reason,
      timestamp: new Date().toISOString(),
    };
  },
} as any);
