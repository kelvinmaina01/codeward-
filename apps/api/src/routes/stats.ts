import { Hono } from 'hono';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, count, sum } from 'drizzle-orm';

export const statsRouter = new Hono();

statsRouter.get('/dashboard', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  // In a real implementation we would scope this by org/repo and date range
  // For now we just return some aggregates to replace the mock data.
  
  const reposCount = await db.select({ count: count() }).from(schema.repositories).where(eq(schema.repositories.userId, session.user.id));
  const runsCount = await db.select({ count: count() }).from(schema.runs);
  const debtRemoved = await db.select({ total: sum(schema.agentTasks.findingsCount) }).from(schema.agentTasks).where(eq(schema.agentTasks.agentId, 'bloat'));

  return c.json({
    repositoriesProtected: reposCount[0]?.count || 0,
    runsToday: runsCount[0]?.count || 0,
    debtRemoved: debtRemoved[0]?.total || 0,
    interventions: 0, // Mock for now
    platformHealth: 77, // Mock for now
    recentActivity: [] // Would join runs and agentTasks
  });
});
