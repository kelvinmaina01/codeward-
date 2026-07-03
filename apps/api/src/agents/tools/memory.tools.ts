import { z } from 'zod';

const MEMORY_TYPES = ['pattern', 'exception', 'preference', 'regression'] as const;

/**
 * Real shared agent_memory tools, identical implementation across every agent. Deliberately
 * NOT scoped to the calling agent's own agentType on read — the whole point of one shared
 * table is that e.g. bloat sees a memory security wrote about the same file before deciding
 * refactorSafe. agentType is stamped on write (provenance) and only used as an optional
 * narrowing filter on read, never a default filter.
 */
export const createMemoryTools = (agentId: string) => ({
  search_memory: {
    description: 'Search real shared memory for this repo — prior findings, dismissals, patterns, and regressions written by ANY agent, not just this one. Use this to avoid re-flagging something the team already dismissed, or to check whether another agent already flagged a file as risky before you act on it.',
    parameters: z.object({
      repoId: z.string(),
      filePath: z.string().optional().describe('Narrow to memories scoped to this file, plus repo-wide (no-file) memories.'),
      agentType: z.string().optional().describe('Narrow to memories written by one specific agent. Omit to see every agent\'s memories — this is the default and usually what you want.'),
      limit: z.number().optional().default(10)
    }),
    execute: async (args: { repoId: string; filePath?: string; agentType?: string; limit?: number }) => {
      const { db } = await import('../../db/index.js');
      const { agentMemory } = await import('../../db/schema.js');
      const { eq, and, or, isNull, desc, inArray, sql } = await import('drizzle-orm');

      const conditions = [eq(agentMemory.repoId, String(args.repoId))];
      if (args.agentType) conditions.push(eq(agentMemory.agentType, args.agentType));
      if (args.filePath) conditions.push(or(eq(agentMemory.filePath, args.filePath), isNull(agentMemory.filePath))!);

      const rows = await db.select().from(agentMemory)
        .where(and(...conditions))
        .orderBy(desc(agentMemory.confidence), desc(agentMemory.lastUsedAt))
        .limit(args.limit ?? 10);

      if (rows.length > 0) {
        await db.update(agentMemory)
          .set({ useCount: sql`${agentMemory.useCount} + 1`, lastUsedAt: new Date() })
          .where(inArray(agentMemory.id, rows.map((r) => r.id)));
      }

      return {
        memories: rows.map((r) => ({
          id: r.id, writtenBy: r.agentType, memoryType: r.memoryType,
          filePath: r.filePath, summary: r.summary, confidence: r.confidence
        }))
      };
    }
  },

  write_memory: {
    description: `Write a real, durable learning to shared memory, visible to every agent on this repo — not just ${agentId}. Use for a dismissed finding, a recurring pattern across runs, a team preference/convention, or a regression (something fixed before that came back). Not for one-off observations only relevant to this single run.`,
    parameters: z.object({
      repoId: z.string(),
      summary: z.string(),
      memoryType: z.enum(MEMORY_TYPES).optional().default('pattern'),
      filePath: z.string().optional(),
      confidence: z.number().min(0).max(1).optional().default(0.6)
    }),
    execute: async (args: { repoId: string; summary: string; memoryType?: typeof MEMORY_TYPES[number]; filePath?: string; confidence?: number }) => {
      const { db } = await import('../../db/index.js');
      const { agentMemory } = await import('../../db/schema.js');
      const { randomUUID } = await import('crypto');
      const [row] = await db.insert(agentMemory).values({
        id: randomUUID(), repoId: String(args.repoId), agentType: agentId,
        memoryType: args.memoryType ?? 'pattern', filePath: args.filePath ?? null,
        summary: args.summary, confidence: args.confidence ?? 0.6
      }).returning();
      return { success: true, id: row.id };
    }
  }
});
