import { Hono } from 'hono';
import { db } from '../db/index.js';
import { demoLeads } from '../db/schema.js';

export const leadsRouter = new Hono();

leadsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, companyName, teamSize, gitProvider } = body;

    // Basic validation
    if (!name || !email || !companyName || !teamSize || !gitProvider) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const [lead] = await db.insert(demoLeads).values({
      name,
      email,
      companyName,
      teamSize,
      gitProvider
    }).returning();

    return c.json({ success: true, lead });
  } catch (error) {
    console.error('Error saving lead:', error);
    return c.json({ error: 'Failed to save lead' }, 500);
  }
});
