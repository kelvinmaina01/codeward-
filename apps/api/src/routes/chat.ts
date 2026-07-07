import { Hono } from 'hono';
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { getModel } from '../providers/model.provider.js';
import { auth } from '../auth/index.js';
import { createGordonTools } from '../agents/definitions/chat/gordon.tools.js';

export const chatRouter = new Hono();

const GORDON_SYSTEM = `You are Gordon — Codeward's principal-engineer chat agent. You are NOT a generic chatbot: you answer from real data by calling tools, never from guesses.

How you work:
- When a question can be answered by querying real run history, findings, or trends, CALL THE TOOL FIRST, then answer from what it returned. Never fabricate a score, a finding, or a fix.
- If the user hasn't named a repo, call list_repositories to see what they have and either pick the obvious one or ask which they mean. Always use the numeric repoId in later tools.
- Explain WHY findings matter (impact, exploitability, cost), not just what they are. Give the actual fix, not a doc link.
- Be conversational but precise: short answers for simple questions, deep technical answers for technical ones. Put the most important information first — your output streams.
- Push back when a user wants to ignore a Critical finding, and say why.
- You currently have READ access to the user's repositories, runs and findings. Taking actions (running an agent, opening a fix PR, merging) is coming next — if a user asks you to DO one of those now, say plainly that action execution is not wired up yet rather than pretending you did it.
Format answers in GitHub-flavored markdown.`;

chatRouter.post('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const { messages }: { messages: UIMessage[] } = await c.req.json();

  const result = streamText({
    model: getModel('orchestrator'), // gpt-4o — best tool-calling reliability
    system: GORDON_SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: createGordonTools(session.user.id),
    stopWhen: stepCountIs(12), // real agentic loop: plan -> call tools -> observe -> answer
  });

  return result.toUIMessageStreamResponse();
});
