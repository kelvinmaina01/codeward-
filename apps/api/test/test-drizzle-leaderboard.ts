import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function test() {
  try {
    const dbUsers = await db
      .select({
        userId: schema.user.id,
        name: schema.user.name,
        image: schema.user.image,
        leaderboardOptIn: schema.user.leaderboardOptIn,
        linesRemoved: sql<number>`COALESCE(SUM((${schema.agentTasks.reportMeta}->>'linesRemoved')::int), 0)`,
        fixedCount: sql<number>`COALESCE(SUM((${schema.agentTasks.reportMeta}->>'fixedCount')::int), 0)`,
        appliedFixes: sql<number>`COALESCE(SUM(CASE WHEN jsonb_typeof(${schema.agentTasks.reportMeta}->'autoFixPR'->'appliedFixes') = 'array' THEN jsonb_array_length(${schema.agentTasks.reportMeta}->'autoFixPR'->'appliedFixes') ELSE 0 END), 0)`,
        orgName: sql<string | null>`MIN(${schema.organization.githubLogin})`,
      })
      .from(schema.user)
      .leftJoin(schema.repositories, eq(schema.repositories.userId, schema.user.id))
      .leftJoin(schema.runs, eq(schema.runs.repoId, schema.repositories.id))
      .leftJoin(schema.agentTasks, eq(schema.agentTasks.runId, schema.runs.id))
      .leftJoin(schema.organization, eq(schema.organization.id, schema.repositories.orgId))
      .where(eq(schema.user.isDeleted, false))
      .groupBy(schema.user.id, schema.user.name, schema.user.image, schema.user.leaderboardOptIn);

    console.log('Results:', dbUsers.length);
  } catch (err) {
    console.error('Error in test:', err);
  }
}

test();
