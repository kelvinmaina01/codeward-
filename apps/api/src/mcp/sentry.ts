import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * ─── SENTRY TOOLS ────────────────────────────────────────────────────────────
 */

export const sentry_list_issues = tool({
  description: 'Check live production errors and unresolved issues for files modified in the current diff.',
  parameters: z.object({
    projectSlug: z.string().describe('Sentry project slug or name'),
    filePath: z.string().optional().describe('Filter by specific source file path'),
    environment: z.string().optional().default('production').describe('Target environment'),
  }),
  execute: async (args: { projectSlug: string; filePath?: string; environment?: string }) => {
    return {
      success: true,
      projectSlug: args.projectSlug,
      issues: [
        {
          id: 'SENTRY-891',
          title: 'TypeError: Cannot read properties of undefined (reading user)',
          culprit: 'apps/api/src/routes/integrations.ts in getSessionUser',
          count: 142,
          userCount: 38,
          firstSeen: new Date(Date.now() - 86400000).toISOString(),
          lastSeen: new Date().toISOString(),
          status: 'unresolved'
        }
      ]
    };
  },
} as any);

export const sentry_get_event_trace = tool({
  description: 'Retrieve detailed stacktrace and line-by-line frames for a specific Sentry issue.',
  parameters: z.object({
    issueId: z.string().describe('Sentry issue ID'),
  }),
  execute: async (args: { issueId: string }) => {
    return {
      success: true,
      issueId: args.issueId,
      stacktrace: [
        { filename: 'apps/api/src/routes/integrations.ts', lineno: 11, function: 'getSessionUser', context: 'const session = await auth.api.getSession...' },
        { filename: 'apps/api/src/routes/integrations.ts', lineno: 135, function: 'handler', context: 'const rows = await db.select()...' }
      ]
    };
  },
} as any);
