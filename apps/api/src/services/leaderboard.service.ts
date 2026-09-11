import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export interface LeaderboardContributionInput {
  repoId: number;
  runId?: number;
  linesRemoved?: number;
  fixedCount?: number;
  appliedFixes?: number;
}

/**
 * Incrementally records debt cleared into leaderboard_score and daily_stats in real time
 * without incurring Redis costs or doing expensive table scans.
 */
export async function recordLeaderboardContribution(input: LeaderboardContributionInput): Promise<void> {
  const { repoId, linesRemoved = 0, fixedCount = 0, appliedFixes = 0 } = input;
  const scoreDelta = (linesRemoved || 0) + (appliedFixes || 0) * 25 + (fixedCount || 0) * 18;
  if (scoreDelta <= 0) return;

  try {
    // 1. Fetch repo to find owner / org
    const [repo] = await db
      .select({
        id: schema.repositories.id,
        userId: schema.repositories.userId,
        orgId: schema.repositories.orgId,
      })
      .from(schema.repositories)
      .where(eq(schema.repositories.id, repoId));

    if (!repo) return;

    let entityId = '';
    let entityType: 'org' | 'user' = 'user';
    let orgSlug: string | null = null;
    let ownerUserId = repo.userId;
    let ownerName = 'Developer';
    let ownerImage: string | null = null;

    if (repo.orgId) {
      entityId = `org:${repo.orgId}`;
      entityType = 'org';

      const [org] = await db
        .select({
          id: schema.organization.id,
          githubLogin: schema.organization.githubLogin,
        })
        .from(schema.organization)
        .where(eq(schema.organization.id, repo.orgId));

      if (org) orgSlug = org.githubLogin;

      // Find owner of org
      const [ownerMember] = await db
        .select({
          userId: schema.organizationMember.userId,
          name: schema.user.name,
          image: schema.user.image,
        })
        .from(schema.organizationMember)
        .innerJoin(schema.user, eq(schema.user.id, schema.organizationMember.userId))
        .where(
          and(
            eq(schema.organizationMember.orgId, repo.orgId),
            eq(schema.organizationMember.role, 'owner')
          )
        )
        .limit(1);

      if (ownerMember) {
        ownerUserId = ownerMember.userId;
        ownerName = ownerMember.name || orgSlug || 'Organization';
        ownerImage = ownerMember.image;
      } else if (repo.userId) {
        const [u] = await db.select({ name: schema.user.name, image: schema.user.image }).from(schema.user).where(eq(schema.user.id, repo.userId));
        if (u) {
          ownerName = u.name || 'Developer';
          ownerImage = u.image;
        }
      }
    } else if (repo.userId) {
      entityId = `user:${repo.userId}`;
      entityType = 'user';

      const [u] = await db
        .select({
          name: schema.user.name,
          image: schema.user.image,
        })
        .from(schema.user)
        .where(eq(schema.user.id, repo.userId));

      if (u) {
        ownerName = u.name || 'Developer';
        ownerImage = u.image;
      }
    } else {
      return;
    }

    // 2. Upsert into leaderboard_score table
    await db
      .insert(schema.leaderboardScore)
      .values({
        entityId,
        entityType,
        orgSlug,
        ownerUserId,
        ownerName,
        ownerImage,
        score: scoreDelta,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.leaderboardScore.entityId,
        set: {
          score: sql`${schema.leaderboardScore.score} + ${scoreDelta}`,
          ownerName,
          ownerImage,
          updatedAt: new Date(),
        },
      });

    // 3. Upsert into daily_stats table (bucketed by UTC day)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [existingDaily] = await db
      .select({ id: schema.dailyStats.id })
      .from(schema.dailyStats)
      .where(
        and(
          eq(schema.dailyStats.entityId, entityId),
          eq(schema.dailyStats.date, today)
        )
      )
      .limit(1);

    if (existingDaily) {
      await db
        .update(schema.dailyStats)
        .set({
          linesCleared: sql`${schema.dailyStats.linesCleared} + ${scoreDelta}`,
        })
        .where(eq(schema.dailyStats.id, existingDaily.id));
    } else {
      await db.insert(schema.dailyStats).values({
        entityId,
        date: today,
        linesCleared: scoreDelta,
      });
    }
  } catch (err) {
    console.error('[LeaderboardService] Failed to record leaderboard contribution:', err);
  }
}
