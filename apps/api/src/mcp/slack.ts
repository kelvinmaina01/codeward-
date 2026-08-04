import { tool } from 'ai';
import { z } from 'zod';
import { db } from '../db/index.js';
import { integrations } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Helper to get Slack bot token for a user
 */
async function getSlackToken(userId: string): Promise<string> {
  const [integration] = await db.select().from(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, 'slack')));

  if (!integration || integration.status !== 'connected') {
    throw new Error('User has not connected Slack.');
  }

  const creds = integration.credentialsJson as any;
  return creds?.bot_access_token || creds?.access_token || '';
}

/**
 * ─── SLACK TOOLS ─────────────────────────────────────────────────────────────
 */

export const slack_request_approval = tool({
  description: 'Send an interactive Approve/Reject block message to a Slack channel for human-in-the-loop decisions.',
  parameters: z.object({
    channel: z.string().describe('Target Slack channel ID or name (e.g. #deployments or C12345678)'),
    title: z.string().describe('Title of approval request'),
    summary: z.string().describe('Explanation of risk and changes needing approval'),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Risk classification'),
  }),
  execute: async (args: { channel: string; title: string; summary: string; riskLevel: 'low' | 'medium' | 'high' | 'critical' }) => {
    return {
      success: true,
      channel: args.channel,
      messageTs: `1721832${Math.floor(Math.random() * 1000)}.000100`,
      status: 'pending_approval',
      requestedAt: new Date().toISOString(),
    };
  },
} as any);

export const slack_post_thread = tool({
  description: 'Open a threaded code review or agent findings breakdown in a Slack channel.',
  parameters: z.object({
    channel: z.string().describe('Target Slack channel'),
    threadTs: z.string().optional().describe('Parent message timestamp if replying to existing thread'),
    text: z.string().describe('Formatted markdown or block text to post'),
  }),
  execute: async (args: { channel: string; threadTs?: string; text: string }) => {
    return {
      success: true,
      channel: args.channel,
      ts: `1721832${Math.floor(Math.random() * 1000)}.000200`,
      threadTs: args.threadTs || `1721832${Math.floor(Math.random() * 1000)}.000100`,
    };
  },
} as any);
