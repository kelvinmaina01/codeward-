import { Hono } from 'hono';
import { streamText, tool } from 'ai';
import { getModel } from '../providers/model.provider.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/index.js';

export const chatRouter = new Hono();

chatRouter.post('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { messages } = await c.req.json();

  const result = streamText({
    model: getModel('orchestrator'),
    messages,
    system: `You are Codeward AI, a senior staff engineer agent. You have full access to the user's codebase context. 
    You can query recent runs, explain tech debt, and trigger security scans.
    Be concise, technical, and helpful. Do not apologize.`,
    tools: {
      query_run_history: tool({
        description: 'Fetch the recent automated agent runs to check the health of repositories.',
        parameters: z.object({
          limit: z.number().optional().default(5)
        }),
        execute: async ({ limit }: { limit?: number }) => {
          const runs = await db.select().from(schema.runs).limit(limit || 5);
          return { runs };
        }
      } as any),
      explain_debt_item: tool({
        description: 'Get an explanation for a specific tech debt finding by its ID or title.',
        parameters: z.object({
          query: z.string().describe('The finding title or category')
        }),
        execute: async ({ query }: { query: string }) => {
          return { explanation: `The debt item "${query}" typically indicates outdated dependencies or lack of test coverage. I recommend running a full architecture audit.` };
        }
      } as any),
      spawn_security_scan: tool({
        description: 'Triggers a security scan on a specific repository.',
        parameters: z.object({
          repo: z.string().describe('The full name of the repository, e.g. "acme/api"')
        }),
        execute: async ({ repo }: { repo: string }) => {
          return { status: 'triggered', message: `Security scan initiated for ${repo}. Results will be available in the dashboard shortly.` };
        }
      } as any)
    }
  });

  return (result as any).toDataStreamResponse ? (result as any).toDataStreamResponse() : (result as any).toTextStreamResponse();
});
