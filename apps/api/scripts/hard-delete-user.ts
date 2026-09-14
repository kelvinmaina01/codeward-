import { db } from '../src/db/index.js';
import { user, account, session, organizationMember, accountDeletions, repositories, runs, runLogs } from '../src/db/schema.js';
import { eq, inArray } from 'drizzle-orm';

async function hardDelete() {
  console.log("Searching for soft-deleted users...");
  const users = await db.select().from(user).where(eq(user.isDeleted, true));
  if (users.length === 0) {
    console.log("No soft-deleted users found.");
    process.exit(0);
  }
  
  for (const u of users) {
    console.log(`Hard deleting user: ${u.email} (${u.id})`);
    // Delete cascading dependencies manually just in case
    await db.delete(accountDeletions).where(eq(accountDeletions.userId, u.id)).catch(() => {});
    await db.delete(session).where(eq(session.userId, u.id)).catch(() => {});
    await db.delete(account).where(eq(account.userId, u.id)).catch(() => {});
    await db.delete(organizationMember).where(eq(organizationMember.userId, u.id)).catch(() => {});
    
    // Nuke repos (which requires nuking runLogs and runs first)
    const repos = await db.select().from(repositories).where(eq(repositories.userId, u.id));
    for (const r of repos) {
      await db.delete(runLogs).where(inArray(runLogs.runId, db.select({ id: runs.id }).from(runs).where(eq(runs.repoId, r.id)))).catch(() => {});
      await db.delete(runs).where(eq(runs.repoId, r.id)).catch(() => {});
      await db.delete(repositories).where(eq(repositories.id, r.id)).catch(() => {});
    }

    await db.delete(user).where(eq(user.id, u.id));
    console.log(`Successfully nuked user ${u.email} from existence.`);
  }
  process.exit(0);
}

hardDelete().catch(e => { console.error(e); process.exit(1); });
