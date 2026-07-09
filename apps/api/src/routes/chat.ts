import { Hono } from 'hono';
import { streamText, generateText, convertToModelMessages, stepCountIs, type UIMessage } from 'ai';
import { eq, and, desc, inArray, count } from 'drizzle-orm';
import { getModel } from '../providers/model.provider.js';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { chatSessions, chatMessages, repositories, runs, mergeApprovals, gordonEvents } from '../db/schema.js';
import { createGordonTools, accessibleRepoIds, assertRepoAccess } from '../agents/definitions/chat/gordon.tools.js';

export const chatRouter = new Hono();

const GORDON_SYSTEM = `You are Gordon — Codeward's principal-engineer chat agent. You are NOT a generic chatbot: you answer from real data by calling tools, never from guesses.

How you work:
- When a question can be answered by querying real run history, findings, or trends, CALL THE TOOL FIRST, then answer from what it returned. Never fabricate a score, a finding, or a fix.
- If the user hasn't named a repo, call list_repositories to see what they have and either pick the obvious one or ask which they mean. Always use the numeric repoId in later tools.
- Explain WHY findings matter (impact, exploitability, cost), not just what they are. Give the actual fix, not a doc link.
- Be conversational but precise: short answers for simple questions, deep technical answers for technical ones. Put the most important information first — your output streams.
- Push back when a user wants to ignore a Critical finding, and say why.

Your capabilities are REAL:
- READ: run history, findings, trends, fix priorities, agents' shared memory, and actual source files (read_repo_file / list_repo_dir via the GitHub API), plus live run status (get_run_status).
- ACT (these require the user to approve a card before they run — never claim you did them until the tool returns success): spawn_agent runs an analysis agent in a real sandbox; approve_and_merge / reject_fix act on real pending auto-fix PRs. After spawning an agent, tell the user it's running and offer to follow progress with get_run_status. If an action tool returns an error, report it honestly.

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

/**
 * Skills — Gordon's slash commands. Server-owned so the set can grow without a client deploy.
 * Each is a templated prompt the composer inserts when the user picks it from the "/" menu;
 * {repo} is filled with the pinned repo's name (or a gentle placeholder).
 */
const GORDON_SKILLS = [
  { id: 'scan', label: '/scan', description: 'Run a security scan on the active repo', template: 'Run a security scan on {repo} and walk me through what you find.' },
  { id: 'fix', label: '/fix', description: 'Find the highest-priority issues and offer to fix', template: 'What are the highest-priority issues in {repo} right now, and can you open fixes for the safe ones?' },
  { id: 'report', label: '/report', description: 'Summarize the latest run', template: 'Give me a summary of the latest run for {repo}: score, top findings by severity, and what changed.' },
  { id: 'compare', label: '/compare', description: 'Compare health across my repos', template: 'Compare the health scores across all my repositories and show them as a table, worst first.' },
  { id: 'health', label: '/health', description: 'Health trend over time', template: 'How has the code health of {repo} trended over the last 30 days?' },
  { id: 'approvals', label: '/approvals', description: 'Show pending auto-fix PRs to approve', template: 'Show me the Codeward auto-fix PRs waiting for a merge decision.' },
];

chatRouter.get('/skills', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ skills: GORDON_SKILLS });
});

/**
 * Dynamic suggested prompts — NOT hardcoded. Computed from the user's REAL activity: pending
 * approvals, lowest-health repo, never-scanned repos, most-recent run, and cross-repo compare.
 * Each suggestion carries an `icon` key the client maps to a hugeicon. Only suggestions backed
 * by real data are returned, best/most-actionable first; falls back to safe generic prompts
 * only when the account has literally no repos yet.
 */
chatRouter.get('/suggestions', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const ids = await accessibleRepoIds(user.id);
  if (ids.length === 0) {
    return c.json({ suggestions: [
      { id: 'connect', icon: 'connect', title: 'Connect your first repository', subtitle: 'Gordon works from your real repos', prompt: 'How do I connect a repository to Codeward so you can analyze it?' },
      { id: 'what', icon: 'info', title: 'What can you do?', subtitle: 'See Gordon’s real capabilities', prompt: 'What can you actually do for me, and what data do you work from?' },
    ] });
  }

  const repos = await db.select().from(repositories).where(inArray(repositories.id, ids));
  const byId = new Map(repos.map((r) => [r.id, r]));

  // Latest run per repo (one query, then reduce in JS).
  const latestByRepo = new Map<number, { score: number | null; status: string; at: Date | null }>();
  for (const r of repos) {
    const [latest] = await db.select().from(runs).where(eq(runs.repoId, r.id)).orderBy(desc(runs.createdAt)).limit(1);
    if (latest) latestByRepo.set(r.id, { score: latest.score, status: latest.status, at: latest.createdAt });
  }

  const pending = await db.select({ id: mergeApprovals.id }).from(mergeApprovals)
    .where(and(inArray(mergeApprovals.repoId, ids), eq(mergeApprovals.status, 'pending')));

  const suggestions: Array<{ id: string; icon: string; title: string; subtitle: string; prompt: string }> = [];

  // 1) Pending approvals — highest-value action.
  if (pending.length > 0) {
    suggestions.push({ id: 'approvals', icon: 'approvals',
      title: `Review ${pending.length} auto-fix PR${pending.length === 1 ? '' : 's'} waiting`,
      subtitle: 'Approve or reject Codeward’s fixes', prompt: 'Show me the Codeward auto-fix PRs waiting for a merge decision, with the guardian verdict for each.' });
  }

  // 2) Lowest-health scanned repo — what to fix.
  const scored = repos.map((r) => ({ r, s: latestByRepo.get(r.id)?.score })).filter((x) => x.s != null) as { r: typeof repos[number]; s: number }[];
  if (scored.length) {
    scored.sort((a, b) => a.s - b.s);
    const worst = scored[0];
    suggestions.push({ id: 'fix-worst', icon: 'fix',
      title: `Fix ${worst.r.name} (health ${worst.s})`,
      subtitle: 'Your lowest-scoring repository', prompt: `What are the highest-priority issues in ${worst.r.fullName} right now, and can you open fixes for the safe ones?` });
  }

  // 3) A never-scanned repo — nudge a first scan.
  const neverScanned = repos.find((r) => !latestByRepo.has(r.id) && !r.paused);
  if (neverScanned) {
    suggestions.push({ id: 'scan-new', icon: 'scan',
      title: `Scan ${neverScanned.name}`,
      subtitle: 'Never analyzed yet', prompt: `Run a security scan on ${neverScanned.fullName} and walk me through what you find.` });
  }

  // 4) Most-recently scanned repo — summarize it.
  const recent = [...latestByRepo.entries()].sort((a, b) => (b[1].at?.getTime() ?? 0) - (a[1].at?.getTime() ?? 0))[0];
  if (recent) {
    const rr = byId.get(recent[0])!;
    suggestions.push({ id: 'report-recent', icon: 'report',
      title: `Summarize ${rr.name}’s latest scan`,
      subtitle: 'Score, top findings, what changed', prompt: `Give me a summary of the latest run for ${rr.fullName}: score, top findings by severity, and what changed.` });
  }

  // 5) Compare — only meaningful with 2+ scored repos.
  if (scored.length >= 2) {
    suggestions.push({ id: 'compare', icon: 'compare',
      title: `Compare health across ${scored.length} repos`,
      subtitle: 'Ranked worst to best', prompt: 'Compare the health scores across all my repositories and show them as a table, worst first.' });
  }

  return c.json({ suggestions: suggestions.slice(0, 6) });
});

/**
 * Gordon Logs — real, per-user accountability trail from gordon_events. Newest first, paginated.
 * Enriches repoId → repo name so the client can show a human label. The full input/output preview
 * is included for the collapsible per-row breakdown.
 */
chatRouter.get('/logs', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const limit = Math.min(Number(c.req.query('limit')) || 100, 500);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

  const rows = await db.select().from(gordonEvents)
    .where(eq(gordonEvents.userId, user.id))
    .orderBy(desc(gordonEvents.createdAt))
    .limit(limit).offset(offset);

  // Resolve repo names for the repoIds present (bounded set).
  const repoIds = [...new Set(rows.map((r) => r.repoId).filter((x): x is number => x != null))];
  const repoNames = new Map<number, string>();
  if (repoIds.length) {
    const rr = await db.select({ id: repositories.id, fullName: repositories.fullName }).from(repositories).where(inArray(repositories.id, repoIds));
    for (const r of rr) repoNames.set(r.id, r.fullName);
  }

  const total = (await db.select({ n: count() }).from(gordonEvents).where(eq(gordonEvents.userId, user.id)))[0]?.n ?? rows.length;

  return c.json({
    total: Number(total), limit, offset,
    logs: rows.map((r) => ({
      id: r.id, toolName: r.toolName, repoId: r.repoId, repoName: r.repoId ? repoNames.get(r.repoId) ?? null : null,
      success: r.success, requiredApproval: r.requiredApproval, durationMs: r.durationMs, errorText: r.errorText,
      createdAt: r.createdAt, input: r.input, outputSummary: r.outputSummary,
    })),
  });
});

// Lightweight repo list for the composer's @-tag picker.
chatRouter.get('/repos', async (c) => {
  const user = await getSessionUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const ids = await accessibleRepoIds(user.id);
  if (ids.length === 0) return c.json({ repos: [] });
  const rows = await db.select({ id: repositories.id, fullName: repositories.fullName }).from(repositories).where(inArray(repositories.id, ids));
  return c.json({ repos: rows });
});

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

  const { messages, sessionId, repoId }: { messages: UIMessage[]; sessionId?: string; repoId?: number } = await c.req.json();
  if (!Array.isArray(messages) || messages.length === 0) return c.json({ error: 'messages required' }, 400);

  // Resolve or lazily create the session. A bad/foreign sessionId falls through to a fresh
  // one rather than erroring — the user's message must never be lost to a stale drawer click.
  let session = sessionId ? await ownedSession(user.id, sessionId) : null;
  const isNewSession = !session;
  if (!session) {
    [session] = await db.insert(chatSessions).values({ userId: user.id }).returning();
  }

  // Pinned repo (@-tag): validate ownership, persist it on the session, and tell Gordon which
  // repo is active so it defaults tools to it without re-asking.
  let activeRepoLine = '';
  if (typeof repoId === 'number' && (await assertRepoAccess(user.id, repoId))) {
    if (session.repoId !== repoId) await db.update(chatSessions).set({ repoId }).where(eq(chatSessions.id, session.id));
    const [repo] = await db.select().from(repositories).where(eq(repositories.id, repoId));
    if (repo) activeRepoLine = `\n\nACTIVE REPO: the user has pinned "${repo.fullName}" (repoId ${repoId}). Default to this repoId for repo-scoped tools unless they clearly mean another.`;
  }

  // Persist the incoming user message now (not in onFinish) so even an aborted/errored
  // generation keeps a record of what the user asked — "persist every prompt and trial".
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
    await db.insert(chatMessages).values({ sessionId: session.id, role: 'user', parts: lastMessage.parts as unknown[] });
  }

  const result = streamText({
    model: getModel('orchestrator'), // gpt-4o — best tool-calling reliability
    system: GORDON_SYSTEM + activeRepoLine,
    messages: await convertToModelMessages(messages),
    tools: createGordonTools(user.id, session.id),
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
