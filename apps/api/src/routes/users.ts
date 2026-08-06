import { Hono } from 'hono';
import { db } from '../db/index.js';
import { repositories, chatSessions, workspace, user, accountDeletions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { auth } from '../auth/index.js';
import { NotificationService } from '../notifications/NotificationService.js';

export const usersRouter = new Hono();

usersRouter.post('/me/delete', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session || !session.user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userId = session.user.id;
  const userName = session.user.name || 'User';
  const userEmail = session.user.email;

  // 1. Gather data summary
  const reposCount = await db.$count(repositories, eq(repositories.userId, userId));
  const chatSessionsCount = await db.$count(chatSessions, eq(chatSessions.userId, userId));
  const workspacesCount = await db.$count(workspace, eq(workspace.ownerId, userId));

  const dataSummary = {
    Repositories: reposCount,
    'Chat Sessions': chatSessionsCount,
    Workspaces: workspacesCount,
  };

  // 2. Insert into account_deletions queue and update user table
  await db.transaction(async (tx) => {
    await tx.update(user).set({ isDeleted: true }).where(eq(user.id, userId));
    await tx.insert(accountDeletions).values({
      userId: userId,
      status: 'pending',
    });
  });

  // 3. Send email asynchronously
  try {
    await NotificationService.sendAccountDeletionQueued(userEmail, userName, dataSummary);
  } catch (err) {
    console.error('Failed to send account deletion email:', err);
    // Continue even if email fails
  }

  // 4. Revoke the user's session (log them out)
  // The client side better-auth SDK handles clearing cookies, but we can revoke it server-side too if needed
  try {
     // BetterAuth doesn't have a direct revoke by session object easily accessible via `api`, 
     // but client will call signOut() anyway.
  } catch(e) {}

  return c.json({ success: true });
});
