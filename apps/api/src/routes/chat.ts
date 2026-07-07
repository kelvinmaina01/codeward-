import { Hono } from 'hono';
import { streamText, generateText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { eq, and, desc } from 'drizzle-orm';
import { getModel } from '../providers/model.provider.js';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { chatSessions, chatMessages } from '../db/schema.js';
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
Format answers in GitHub-flavored markdown. When comparing repos, listing findings, or presenting anything with 3+ rows of structure, use a GFM table.`;

async function getSessionUser(c: any) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

/** Loads a chat session only if it belongs to this user — never trust a raw id. */
async function ownedSession(userId: string, sessionId: string) {
  const [row] = await db.select().from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
  return row ?? null;
}

/**
 * Fire-and-forget auto-titling, Claude-style: after the first exchange, a cheap model turns
 * the opening user message into a 3–6 word label. Errors are swallowed — a missing title
 * degrades to "New chat" in the UI, it must never break the chat itself.
 */
function autoTitle(sessionId: string, firstUserText: string) {
  (async () => {
    const { text } = await generateText({
      model: getModel(), // gpt-4o-mini — titling is not worth gpt-4o
      prompt: `Write a 3-6 word title (no quotes, no trailing punctuation) for a developer-tool chat that starts with this message:\n\n"${firstUserText.slice(0, 500)}"`,
    });
    const title = text.trim().replace(/^["']|["']$/g, '').slice(0, 80);
    if (title) await db.update(chatSessions).set({ title }).where(eq(chatSessions.id, sessionId));
  })().catch((e) => console.error('[Gordon] auto-title failed (non-fatal):', (e as Error).message));
}

function textOfMessage(msg: UIMessage): string {
  return (msg.parts ?? []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ');
}

/* ------------------------------- session management ------------------------------- */

chatRouter.get('/sessions', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const rows = await db.select().from(chatSessions)
    .where(and(eq(chatSessions.userId, user.id), eq(chatSessions.archived, false)))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(100);
  return c.json({ sessions: rows });
});

chatRouter.get('/sessions/:id/messages', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const session = await ownedSession(user.id, c.req.param('id'));
  if (!session) return c.json({ error: 'Not found' }, 404);
  const rows = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(chatMessages.createdAt);
  // Rehydrate as UIMessages: parts were stored verbatim, so old tool cards replay exactly.
  return c.json({ session, messages: rows.map((m) => ({ id: m.id, role: m.role, parts: m.parts })) });
});

chatRouter.patch('/sessions/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const session = await ownedSession(user.id, c.req.param('id'));
  if (!session) return c.json({ error: 'Not found' }, 404);
  const body = await c.req.json();
  const patch: Partial<{ title: string; archived: boolean }> = {};
  if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 80);
  if (typeof body.archived === 'boolean') patch.archived = body.archived;
  if (Object.keys(patch).length === 0) return c.json({ error: 'Nothing to update' }, 400);
  const [updated] = await db.update(chatSessions).set(patch).where(eq(chatSessions.id, session.id)).returning();
  return c.json({ session: updated });
});

chatRouter.delete('/sessions/:id', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const session = await ownedSession(user.id, c.req.param('id'));
  if (!session) return c.json({ error: 'Not found' }, 404);
  await db.delete(chatSessions).where(eq(chatSessions.id, session.id)); // messages cascade
  return c.json({ deleted: true });
});

/* ------------------------------------ the chat ------------------------------------ */

chatRouter.post('/', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const { messages, sessionId }: { messages: UIMessage[]; sessionId?: string } = await c.req.json();
  if (!Array.isArray(messages) || messages.length === 0) return c.json({ error: 'messages required' }, 400);

  // Resolve or lazily create the session. A bad/foreign sessionId falls through to a fresh
  // one rather than erroring — the user's message must never be lost to a stale drawer click.
  let session = sessionId ? await ownedSession(user.id, sessionId) : null;
  const isNewSession = !session;
  if (!session) {
    [session] = await db.insert(chatSessions).values({ userId: user.id }).returning();
  }

  // Persist the incoming user message now (not in onFinish) so even an aborted/errored
  // generation keeps a record of what the user asked — "persist every prompt and trial".
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
    await db.insert(chatMessages).values({ sessionId: session.id, role: 'user', parts: lastMessage.parts as unknown[] });
  }

  const result = streamText({
    model: getModel('orchestrator'), // gpt-4o — best tool-calling reliability
    system: GORDON_SYSTEM,
    messages: await convertToModelMessages(messages),
    tools: createGordonTools(user.id),
    stopWhen: stepCountIs(12), // real agentic loop: plan -> call tools -> observe -> answer
  });

  const sessionRef = session;
  return result.toUIMessageStreamResponse({
    headers: { 'X-Chat-Session-Id': session.id },
    onFinish: async ({ responseMessage }) => {
      // The assistant UIMessage parts (text + tool calls with inputs/outputs) verbatim —
      // reopening this chat replays the exact tool cards.
      await db.insert(chatMessages).values({ sessionId: sessionRef.id, role: 'assistant', parts: responseMessage.parts as unknown[] });
      await db.update(chatSessions).set({ updatedAt: new Date() }).where(eq(chatSessions.id, sessionRef.id));
      if (isNewSession || !sessionRef.title) {
        const firstUserText = textOfMessage(lastMessage) || 'New chat';
        autoTitle(sessionRef.id, firstUserText);
      }
    },
  });
});
