import { db } from '../src/db';
import * as schema from '../src/db/schema';
import { eq, isNotNull, or, and, sql } from 'drizzle-orm';

async function backfill() {
  console.log('Starting backfill for leaderboard_score and daily_stats...');

  // 1. Reset everyone's opt-in to false for privacy
  await db.update(schema.user).set({ leaderboardOptIn: false });
  console.log('Reset all users leaderboardOptIn to false.');

  // Clear existing tables
  await db.delete(schema.dailyStats);
  await db.delete(schema.leaderboardScore);
  console.log('Cleared existing leaderboard_score and daily_stats tables.');

  // 2. Fetch the massive aggregation to backfill (this is basically what the old GET /leaderboard did, but we only do it once now)
  const rows = await db
    .select({
      userId:           schema.user.id,
      userName:         schema.user.name,
      userImage:        schema.user.image,
      orgId:            schema.organization.id,
      orgSlug:          schema.organization.githubLogin,
      memberRole:       schema.organizationMember.role,
      taskCompletedAt:  schema.agentTasks.completedAt,
      linesRemoved:     sql<number>`COALESCE((${schema.agentTasks.reportMeta}->>'linesRemoved')::int, 0)`,
      fixedCount:       sql<number>`COALESCE((${schema.agentTasks.reportMeta}->>'fixedCount')::int, 0)`,
      appliedFixes:     sql<number>`COALESCE(CASE WHEN jsonb_typeof(${schema.agentTasks.reportMeta}->'autoFixPR'->'appliedFixes') = 'array' THEN jsonb_array_length(${schema.agentTasks.reportMeta}->'autoFixPR'->'appliedFixes') ELSE 0 END, 0)`,
    })
    .from(schema.user)
    .leftJoin(schema.organizationMember, eq(schema.organizationMember.userId, schema.user.id))
    .leftJoin(schema.organization, eq(schema.organization.id, schema.organizationMember.orgId))
    .leftJoin(schema.repositories, or(
      eq(schema.repositories.userId, schema.user.id),
      and(isNotNull(schema.organizationMember.orgId), eq(schema.repositories.orgId, schema.organizationMember.orgId)),
    ))
    .leftJoin(schema.runs, eq(schema.runs.repoId, schema.repositories.id))
    .leftJoin(schema.agentTasks, eq(schema.agentTasks.runId, schema.runs.id))
    .where(eq(schema.user.isDeleted, false));

  console.log(`Fetched ${rows.length} rows to process.`);

  // Build entities and daily stats
  const entityMap = new Map<string, typeof schema.leaderboardScore.$inferInsert>();
  const dailyMap = new Map<string, number>();

  for (const row of rows) {
    const rawScore = Number(row.linesRemoved || 0)
      + Number(row.appliedFixes || 0) * 25
      + Number(row.fixedCount || 0) * 18;

    if (rawScore === 0) continue; // Skip zero scores to keep it clean

    let entityKey = '';
    
    if (row.orgId && row.orgSlug) {
      entityKey = `org:${row.orgId}`;
      const isOwner = row.memberRole === 'owner';
      
      const existing = entityMap.get(entityKey);
      if (!existing) {
        entityMap.set(entityKey, {
          entityId: entityKey,
          entityType: 'org',
          orgSlug: row.orgSlug,
          ownerUserId: row.userId,
          ownerName: row.userName,
          ownerImage: row.userImage,
          score: rawScore,
        });
      } else {
        existing.score += rawScore;
        if (isOwner) {
          existing.ownerUserId = row.userId;
          existing.ownerName = row.userName;
          existing.ownerImage = row.userImage;
        }
      }
    } else {
      entityKey = `user:${row.userId}`;
      const existing = entityMap.get(entityKey);
      if (!existing) {
        entityMap.set(entityKey, {
          entityId: entityKey,
          entityType: 'user',
          orgSlug: null,
          ownerUserId: row.userId,
          ownerName: row.userName,
          ownerImage: row.userImage,
          score: rawScore,
        });
      } else {
        existing.score += rawScore;
      }
    }

    // Process daily stats
    if (row.taskCompletedAt) {
      // Create a Date object and set it to midnight UTC
      const date = new Date(row.taskCompletedAt);
      date.setUTCHours(0, 0, 0, 0);
      const dailyKey = `${entityKey}|${date.toISOString()}`;
      dailyMap.set(dailyKey, (dailyMap.get(dailyKey) || 0) + rawScore);
    }
  }

  // Insert Leaderboard Scores
  const scoreEntries = Array.from(entityMap.values());
  if (scoreEntries.length > 0) {
    await db.insert(schema.leaderboardScore).values(scoreEntries);
    console.log(`Inserted ${scoreEntries.length} leaderboard_score rows.`);
  } else {
    console.log('No leaderboard_score rows to insert.');
  }

  // Insert Daily Stats
  const dailyEntries = Array.from(dailyMap.entries()).map(([key, score]) => {
    const [entityId, dateStr] = key.split('|');
    return {
      entityId,
      date: new Date(dateStr),
      linesCleared: score,
    };
  });

  if (dailyEntries.length > 0) {
    await db.insert(schema.dailyStats).values(dailyEntries);
    console.log(`Inserted ${dailyEntries.length} daily_stats rows.`);
  } else {
    console.log('No daily_stats rows to insert.');
  }

  console.log('Backfill complete!');
  process.exit(0);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
