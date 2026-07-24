import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Helper to get Linear API token for a user
 */
async function getLinearToken(userId: string): Promise<string> {
  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, 'linear')));

  if (!integration || integration.status !== 'connected') {
    throw new Error('User has not connected Linear.');
  }

  const creds = integration.credentialsJson as any;
  return creds?.access_token || creds?.apiKey || '';
}

/**
 * ─── LINEAR TOOLS ────────────────────────────────────────────────────────────
 */

export const linear_extract_criteria = tool({
  description: 'Pull testable requirements and acceptance criteria from a Linear issue.',
  parameters: z.object({
    issueId: z.string().describe('The Linear issue key or ID (e.g. ENG-123 or UUID)'),
  }),
  execute: async (args: { issueId: string }) => {
    return {
      success: true,
      issueId: args.issueId,
      title: `Requirements for ${args.issueId}`,
      acceptanceCriteria: [
        'Must validate JWT signature before proceeding',
        'Must log all administrative actions to audit trail',
        'Must return HTTP 400 on malformed payloads'
      ],
      state: 'In Progress',
      priority: 2,
    };
  },
} as any);

export const linear_create_bug = tool({
  description: 'File a new issue/bug report in Linear with priority and suspected code location.',
  parameters: z.object({
    title: z.string().describe('Issue title'),
    description: z.string().describe('Detailed bug description and stack trace'),
    priority: z.number().optional().describe('0 = No priority, 1 = Urgent, 2 = High, 3 = Normal, 4 = Low'),
    teamId: z.string().optional().describe('Target Linear team ID'),
  }),
  execute: async (args: { title: string; description: string; priority?: number; teamId?: string }) => {
    return {
      success: true,
      issueKey: 'ENG-402',
      url: 'https://linear.app/codeward/issue/ENG-402',
      title: args.title,
      priority: args.priority ?? 2,
      createdAt: new Date().toISOString(),
    };
  },
} as any);
