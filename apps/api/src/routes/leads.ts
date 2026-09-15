import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { demoLeads } from '../db/schema.js';
import { validateBody, getValidatedBody } from '../middleware/zod-validator.js';

export const leadsRouter = new Hono();

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1, 'Company name is required').max(100),
  teamSize: z.string().min(1, 'Team size is required').max(50),
  gitProvider: z.string().min(1, 'Git provider is required').max(50),
});

leadsRouter.post('/', validateBody(leadSchema), async (c) => {
  try {
    const body = getValidatedBody<z.infer<typeof leadSchema>>(c);
    const { name, email, companyName, teamSize, gitProvider } = body;

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
