import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { Octokit } from 'octokit';

export const prRouter = new Hono();

async function getOctokitForUser(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return null;

  const accounts = await db.select()
    .from(schema.account)
    .where(
      and(
        eq(schema.account.userId, session.user.id),
        eq(schema.account.providerId, 'github')
      )
    );

  const token = accounts[0]?.accessToken;
  if (!token) return null;

  return new Octokit({ auth: token });
}

// GET /api/repos/:owner/:repo/pr/:prNumber
prRouter.get('/:owner/:repo/pr/:prNumber', async (c) => {
  const { owner, repo, prNumber } = c.req.param();
  const octokit = await getOctokitForUser(c.req.raw);
  
  if (!octokit) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10),
    });

    return c.json({
      title: pr.title,
      author: pr.user?.login,
      authorAvatar: pr.user?.avatar_url,
      additions: pr.additions,
      deletions: pr.deletions,
      state: pr.state,
      merged: pr.merged,
      head: pr.head.ref,
      base: pr.base.ref,
      html_url: pr.html_url
    });
  } catch (error: any) {
    console.error(`Error fetching PR ${prNumber}:`, error.message);
    return c.json({ error: 'Failed to fetch PR details' }, 500);
  }
});

// POST /api/repos/:owner/:repo/pr/:prNumber/merge
prRouter.post('/:owner/:repo/pr/:prNumber/merge', async (c) => {
  const { owner, repo, prNumber } = c.req.param();
  const octokit = await getOctokitForUser(c.req.raw);
  
  if (!octokit) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const { data } = await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: parseInt(prNumber, 10),
    });

    return c.json({ success: true, message: data.message });
  } catch (error: any) {
    console.error(`Error merging PR ${prNumber}:`, error.message);
    return c.json({ error: error.message || 'Failed to merge PR' }, 500);
  }
});

// POST /api/repos/:owner/:repo/pr/:prNumber/schedule
prRouter.post('/:owner/:repo/pr/:prNumber/schedule', async (c) => {
  const { owner, repo, prNumber } = c.req.param();
  // Here we would use BullMQ to schedule a job for delayed merging.
  // For now, return success.
  return c.json({ success: true, message: `Merge scheduled for PR #${prNumber}` });
});
