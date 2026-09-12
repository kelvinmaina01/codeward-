import { Hono } from 'hono';
import { db } from '../db/index.js';
import { workspace, workspaceMember, workspaceInvite, user, workspaceAuditLog, workspaceDailyLogin } from '../db/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { verifyEmailRealTime } from '../services/email-verifier.js';
import { sendWorkspaceInviteMagicLink, sendWorkspaceRemovalNotification } from '../services/email-sender.js';
import { auth } from '../auth/index.js';
import crypto from 'crypto';

export const workspacesRouter = new Hono();

// Helper to get authenticated user ID
async function getUserId(c: any): Promise<string> {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch (e) {
    // ignore session error
  }

  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('User ')) {
    return authHeader.replace('User ', '').trim();
  }

  // Check Bearer token in session table
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { session: sessionTable } = await import('../db/schema.js');
    const [foundSession] = await db
      .select({ userId: sessionTable.userId, expiresAt: sessionTable.expiresAt })
      .from(sessionTable)
      .where(eq(sessionTable.token, token))
      .limit(1);

    if (foundSession && new Date() < new Date(foundSession.expiresAt)) {
      return foundSession.userId;
    }
  }

  // Strictly reject unauthenticated requests. NEVER fall back to another user in DB!
  throw new Error('UNAUTHORIZED');
}

// Helper to verify user role in a workspace with strict personal workspace isolation
async function checkWorkspaceRole(
  workspaceId: string, 
  userId: string, 
  allowedRoles: string[]
): Promise<{ role: string; workspace: any }> {
  // Check target workspace existence
  const [targetWs] = await db.select().from(workspace).where(eq(workspace.id, workspaceId));
  if (!targetWs) {
    throw new Error('NOT_FOUND');
  }

  // Strict personal workspace isolation:
  // If the workspace is personal (slug starts with personal-), ONLY the owner can ever access it!
  if (targetWs.slug.startsWith('personal-') && targetWs.ownerId !== userId) {
    throw new Error('FORBIDDEN');
  }

  const [member] = await db
    .select({ role: workspaceMember.role })
    .from(workspaceMember)
    .where(and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, userId)));

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error('FORBIDDEN');
  }

  return { role: member.role, workspace: targetWs };
}

// ── 1. List user's workspaces (Strict personal workspace isolation & auto-provisioning)
workspacesRouter.get('/', async (c) => {
  try {
    const userId = await getUserId(c);

    // Find all workspaces where user is owner or member
    const allWorkspaces = await db
      .select({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        type: workspace.type,
        ownerId: workspace.ownerId,
        role: workspaceMember.role,
        createdAt: workspace.createdAt
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, userId));

    // STRICT ISOLATION: Filter out any personal workspace that doesn't belong to this user
    const userWorkspaces = allWorkspaces.filter(ws => {
      if (ws.slug.startsWith('personal-')) {
        return ws.ownerId === userId;
      }
      return true;
    });

    if (userWorkspaces.length === 0) {
      // Check if user already owns a personal workspace that lacked a membership record
      const [existingPersonal] = await db
        .select()
        .from(workspace)
        .where(and(eq(workspace.ownerId, userId), sql`${workspace.slug} LIKE 'personal-%'`))
        .limit(1);

      if (existingPersonal) {
        await db.insert(workspaceMember).values({
          workspaceId: existingPersonal.id,
          userId: userId,
          role: 'owner'
        }).onConflictDoNothing();

        return c.json({
          workspaces: [{ ...existingPersonal, role: 'owner' }]
        });
      }

      // Auto-create Personal Workspace
      const personalSlug = `personal-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const [newWs] = await db
        .insert(workspace)
        .values({
          name: 'Personal Workspace',
          slug: personalSlug,
          type: 'private',
          ownerId: userId
        })
        .returning();

      await db.insert(workspaceMember).values({
        workspaceId: newWs.id,
        userId: userId,
        role: 'owner'
      });

      return c.json({
        workspaces: [
          {
            ...newWs,
            role: 'owner'
          }
        ]
      });
    }

    return c.json({ workspaces: userWorkspaces });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized: Session missing or expired' }, 401);
    }
    console.error('[Workspaces] List error:', err);
    return c.json({ error: 'Failed to fetch workspaces', details: err.message }, 500);
  }
});

// ── 2. Create a new workspace
workspacesRouter.post('/', async (c) => {
  try {
    const userId = await getUserId(c);
    const body = await c.req.json();
    const { name, type = 'private' } = body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';

    // Validation 1: Length check
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return c.json({
        code: 'INVALID_NAME',
        error: 'Workspace name must be between 2 and 50 characters.'
      }, 400);
    }

    // Validation 2: Reserved words check
    const reservedSlugs = ['admin', 'api', 'system', 'default', 'auth', 'settings', 'billing'];
    const baseSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (reservedSlugs.includes(baseSlug)) {
      return c.json({
        code: 'RESERVED_NAME',
        error: `"${trimmedName}" is a reserved system name. Please choose a different name.`
      }, 400);
    }

    // Validation 3: Check existing user workspace count (Quota limit check)
    const existingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspaceMember)
      .where(eq(workspaceMember.userId, userId));

    const currentCount = Number(existingCount[0]?.count || 0);
    if (currentCount >= 10) {
      return c.json({
        code: 'QUOTA_EXCEEDED',
        error: 'Workspace limit reached (10 max). Please upgrade your account or delete unused workspaces.'
      }, 403);
    }

    // Generate unique slug
    const slug = `${baseSlug || 'workspace'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newWs] = await db
      .insert(workspace)
      .values({
        name: trimmedName,
        slug,
        type: type === 'public' ? 'public' : 'private',
        ownerId: userId
      })
      .returning();

    await db.insert(workspaceMember).values({
      workspaceId: newWs.id,
      userId: userId,
      role: 'owner'
    });

    // Record audit log
    await db.insert(workspaceAuditLog).values({
      workspaceId: newWs.id,
      userId,
      actorName: 'Owner',
      action: `Created workspace "${trimmedName}"`,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      status: 'success'
    });

    return c.json({
      message: 'Workspace created successfully',
      workspace: { ...newWs, role: 'owner' }
    }, 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    console.error('[Workspaces] Create error:', err);
    if (err.message && err.message.includes('unique constraint')) {
      return c.json({
        code: 'SLUG_EXISTS',
        error: 'A workspace with a similar identifier already exists. Try a different name.'
      }, 409);
    }
    return c.json({
      code: 'SERVER_ERROR',
      error: 'Failed to create workspace due to a database error. Please try again.',
      details: err.message
    }, 500);
  }
});

// ── 3. Get Workspace Members with Invite History & Daily Login Counts
workspacesRouter.get('/:id/members', async (c) => {
  try {
    const userId = await getUserId(c);
    const workspaceId = c.req.param('id');
    
    // RBAC: Any member can view workspace members
    const { workspace: targetWs } = await checkWorkspaceRole(workspaceId, userId, ['owner', 'admin', 'developer', 'member', 'viewer']);

    // 1. Check and automatically expire pending invites past 7 days
    const expiredInvites = await db
      .select()
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.workspaceId, workspaceId),
          eq(workspaceInvite.status, 'pending'),
          sql`${workspaceInvite.expiresAt} < NOW()`
        )
      );

    if (expiredInvites.length > 0) {
      for (const exp of expiredInvites) {
        await db
          .update(workspaceInvite)
          .set({ status: 'expired' })
          .where(eq(workspaceInvite.id, exp.id));

        await db.insert(workspaceAuditLog).values({
          workspaceId,
          actorName: 'System',
          action: `Invitation for ${exp.email} expired (7-day window elapsed without login)`,
          ipAddress: '127.0.0.1',
          status: 'warning'
        });
      }
    }

    // 2. Fetch active members
    const members = await db
      .select({
        id: workspaceMember.id,
        userId: workspaceMember.userId,
        role: workspaceMember.role,
        createdAt: workspaceMember.createdAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image
      })
      .from(workspaceMember)
      .leftJoin(user, eq(workspaceMember.userId, user.id))
      .where(eq(workspaceMember.workspaceId, workspaceId));

    // 3. Fetch all invites for this workspace (to know invitedAt for members)
    const allInvites = await db
      .select()
      .from(workspaceInvite)
      .where(eq(workspaceInvite.workspaceId, workspaceId));

    // 4. Fetch daily login stats for this workspace
    const todayDate = new Date().toISOString().split('T')[0];
    const loginRecords = await db
      .select()
      .from(workspaceDailyLogin)
      .where(eq(workspaceDailyLogin.workspaceId, workspaceId));

    // 5. Enrich members with invitedAt, joinedAt, and daily logins
    const enrichedMembers = members.map((m) => {
      const isOwner = m.role === 'owner' || m.userId === targetWs.ownerId;
      const matchedInvite = allInvites.find(
        (i) => i.email.toLowerCase() === (m.userEmail || '').toLowerCase()
      );

      const userLogins = loginRecords.filter((l) => l.userId === m.userId);
      const todayLoginRow = userLogins.find((l) => l.loginDate === todayDate);
      const loginsToday = todayLoginRow ? todayLoginRow.loginCount : 0;
      const totalLogins = userLogins.reduce((acc, l) => acc + l.loginCount, 0);

      const latestLogin = userLogins.length > 0
        ? userLogins.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())[0].lastLoginAt
        : null;

      return {
        id: m.id,
        userId: m.userId,
        name: m.userName || (m.userEmail ? m.userEmail.split('@')[0] : 'Workspace Member'),
        email: m.userEmail || 'No email',
        image: m.userImage,
        role: m.role,
        status: 'Active',
        isOwner,
        invitedAt: isOwner 
          ? targetWs.createdAt 
          : (matchedInvite?.createdAt || m.createdAt),
        joinedAt: m.createdAt,
        loginsToday,
        totalLogins,
        lastLoginAt: latestLogin
      };
    });

    const pendingInvites = allInvites
      .filter((i) => i.status === 'pending')
      .map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: 'Invited',
        invitedAt: i.createdAt,
        expiresAt: i.expiresAt,
        joinedAt: null,
        loginsToday: 0,
        totalLogins: 0
      }));

    return c.json({ members: enrichedMembers, pendingInvites });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'You do not have access to this workspace' }, 403);
    }
    console.error('[Workspaces] Members error:', err);
    return c.json({ error: 'Failed to fetch workspace members', details: err.message }, 500);
  }
});

// ── 4. Invite user(s) to Workspace (7-Day Expiration Policy)
workspacesRouter.post('/:id/invites', async (c) => {
  try {
    const userId = await getUserId(c);
    const workspaceId = c.req.param('id');
    const body = await c.req.json();

    let inviteItems: { email: string; role: string }[] = [];
    if (Array.isArray(body.invites)) {
      inviteItems = body.invites;
    } else if (body.email) {
      inviteItems = [{ email: body.email, role: body.role || 'member' }];
    }

    if (inviteItems.length === 0) {
      return c.json({ error: 'At least one invite with email and role is required' }, 400);
    }

    // RBAC: Only Owners and Admins can invite people
    const { workspace: targetWs } = await checkWorkspaceRole(workspaceId, userId, ['owner', 'admin']);

    // Fetch inviter user info
    const [inviterUser] = await db.select().from(user).where(eq(user.id, userId));
    const inviterName = inviterUser?.name || 'Workspace Administrator';
    
    // Fetch existing members to display in the email
    const existingMembers = await db
      .select({
        name: user.name,
        role: workspaceMember.role,
        image: user.image
      })
      .from(workspaceMember)
      .leftJoin(user, eq(workspaceMember.userId, user.id))
      .where(eq(workspaceMember.workspaceId, workspaceId))
      .limit(5);

    const results: any[] = [];
    let sentCount = 0;

    for (const item of inviteItems) {
      const cleanEmail = item.email.trim().toLowerCase();
      const cleanRole = item.role || 'member';

      if (!cleanEmail || !cleanEmail.includes('@')) continue;

      // Real-time Email Verification via QuickEmailVerification API
      const verificationResult = await verifyEmailRealTime(cleanEmail);
      if (!verificationResult.isValid) {
        results.push({ email: cleanEmail, success: false, reason: verificationResult.message });
        continue;
      }

      // 7 DAYS EXPIRATION WINDOW
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Save Invite in Database
      const [inviteRecord] = await db
        .insert(workspaceInvite)
        .values({
          workspaceId,
          email: cleanEmail,
          role: cleanRole,
          expiresAt,
          status: 'pending',
          invitedBy: userId
        })
        .returning();

      // Send Magic Link Email via Resend API
      const emailResult = await sendWorkspaceInviteMagicLink({
        toEmail: cleanEmail,
        workspaceName: targetWs.name,
        inviterName,
        inviteToken: inviteRecord.id,
        role: cleanRole,
        existingMembers: existingMembers.map(m => ({
          name: m.name || 'Member',
          role: m.role || 'member',
          image: m.image
        }))
      });

      // Log the action in Audit Log
      await db.insert(workspaceAuditLog).values({
        workspaceId,
        userId,
        actorName: inviterName,
        action: `Invited ${cleanEmail} as ${cleanRole} (7-day link)`,
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        status: 'success'
      });

      sentCount++;
      results.push({
        email: cleanEmail,
        role: cleanRole,
        success: true,
        inviteId: inviteRecord.id,
        emailDelivery: emailResult
      });
    }

    if (sentCount === 0 && results.length > 0) {
      return c.json({
        error: 'Failed to verify email addresses',
        details: results
      }, 400);
    }

    return c.json({
      message: `Sent ${sentCount} workspace invitation${sentCount > 1 ? 's' : ''}`,
      sentCount,
      results
    }, 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'You do not have permission to invite members to this workspace' }, 403);
    }
    console.error('[Workspaces] Invite error:', err);
    return c.json({ error: 'Failed to process workspace invites', details: err.message }, 500);
  }
});

// ── 5. Remove Member ("Throw Away") with Email Notification & Audit Logging
workspacesRouter.delete('/:id/members/:memberId', async (c) => {
  try {
    const callerUserId = await getUserId(c);
    const workspaceId = c.req.param('id');
    const targetMemberId = c.req.param('memberId');

    // RBAC: Only Owners and Admins can remove members
    const { role: callerRole, workspace: targetWs } = await checkWorkspaceRole(workspaceId, callerUserId, ['owner', 'admin']);

    // Find the target member (matching workspaceMember.id or workspaceMember.userId)
    const [targetMember] = await db
      .select({
        id: workspaceMember.id,
        userId: workspaceMember.userId,
        role: workspaceMember.role
      })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          sql`(${workspaceMember.id} = ${targetMemberId}::uuid OR ${workspaceMember.userId} = ${targetMemberId})`
        )
      );

    if (!targetMember) {
      return c.json({ error: 'Member not found in this workspace' }, 404);
    }

    // Safety & RBAC Rules:
    // Rule 1: Cannot remove the workspace owner
    if (targetMember.role === 'owner' || targetWs.ownerId === targetMember.userId) {
      return c.json({ error: 'Cannot remove the workspace owner from their workspace' }, 403);
    }

    // Rule 2: Admins cannot remove other Admins (only Owner can)
    if (callerRole === 'admin' && targetMember.role === 'admin') {
      return c.json({ error: 'Admins cannot remove other admins. Only the workspace owner can remove an admin.' }, 403);
    }

    // Rule 3: User cannot remove themselves via admin remove endpoint
    if (targetMember.userId === callerUserId) {
      return c.json({ error: 'Cannot remove yourself using this administrative action' }, 400);
    }

    // Fetch target user's details for email and audit logging
    const [targetUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, targetMember.userId));

    // Fetch caller's details
    const [callerUser] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, callerUserId));

    const actorName = callerUser?.name || 'Workspace Administrator';
    const targetEmail = targetUser?.email || 'Unknown User';

    // 1. Delete member record
    await db
      .delete(workspaceMember)
      .where(eq(workspaceMember.id, targetMember.id));

    // 2. Dispatch email notification to the removed member
    if (targetUser?.email) {
      await sendWorkspaceRemovalNotification({
        toEmail: targetUser.email,
        workspaceName: targetWs.name,
        actorName,
        memberRole: targetMember.role
      });
    }

    // 3. Record chronological audit log
    await db.insert(workspaceAuditLog).values({
      workspaceId,
      userId: callerUserId,
      actorName,
      action: `Removed member ${targetEmail} (${targetMember.role}) from workspace`,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      status: 'success'
    });

    return c.json({
      message: `Member ${targetEmail} has been removed from the workspace and notified via email.`,
      removedMemberId: targetMember.id,
      removedUserId: targetMember.userId
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'You do not have permission to remove members from this workspace' }, 403);
    }
    console.error('[Workspaces] Remove member error:', err);
    return c.json({ error: 'Failed to remove workspace member', details: err.message }, 500);
  }
});

// ── 6. Revoke Pending Invitation
workspacesRouter.delete('/:id/invites/:inviteId', async (c) => {
  try {
    const callerUserId = await getUserId(c);
    const workspaceId = c.req.param('id');
    const inviteId = c.req.param('inviteId');

    // RBAC: Only Owners and Admins can revoke invites
    await checkWorkspaceRole(workspaceId, callerUserId, ['owner', 'admin']);

    const [invite] = await db
      .select()
      .from(workspaceInvite)
      .where(and(eq(workspaceInvite.id, inviteId), eq(workspaceInvite.workspaceId, workspaceId)));

    if (!invite) {
      return c.json({ error: 'Invitation not found' }, 404);
    }

    // Update status to revoked
    await db
      .update(workspaceInvite)
      .set({ status: 'revoked' })
      .where(eq(workspaceInvite.id, inviteId));

    const [callerUser] = await db.select({ name: user.name }).from(user).where(eq(user.id, callerUserId));

    // Audit log
    await db.insert(workspaceAuditLog).values({
      workspaceId,
      userId: callerUserId,
      actorName: callerUser?.name || 'Workspace Administrator',
      action: `Revoked pending invitation for ${invite.email} (${invite.role})`,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      status: 'warning'
    });

    return c.json({ message: `Invitation for ${invite.email} has been revoked.` });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'You do not have permission to manage invitations' }, 403);
    }
    console.error('[Workspaces] Revoke invite error:', err);
    return c.json({ error: 'Failed to revoke invitation', details: err.message }, 500);
  }
});

// ── 7. Accept Workspace Invite (Magic Link - 7-Day Expiry Verification & Passwordless Auth)
workspacesRouter.post('/accept-invite', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token) {
      return c.json({ error: 'Invite token is required' }, 400);
    }

    // Find pending invite
    const [invite] = await db
      .select()
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.id, token),
          eq(workspaceInvite.status, 'pending')
        )
      );

    if (!invite) {
      return c.json({ error: 'Invalid or already accepted invitation' }, 400);
    }

    // Check 7-Day Expiry
    if (new Date() > new Date(invite.expiresAt)) {
      await db.update(workspaceInvite).set({ status: 'expired' }).where(eq(workspaceInvite.id, invite.id));

      await db.insert(workspaceAuditLog).values({
        workspaceId: invite.workspaceId,
        actorName: 'System',
        action: `Invitation for ${invite.email} expired after 7 days without login`,
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        status: 'warning'
      });

      return c.json({ 
        error: 'This invitation has expired (valid for 7 days). Please contact your workspace administrator for a new invite.' 
      }, 400);
    }

    // --- PASSWORDLESS AUTH LOGIC ---
    let [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, invite.email));

    let finalUserId = '';
    
    if (existingUser) {
      finalUserId = existingUser.id;
    } else {
      finalUserId = crypto.randomUUID();
      await db.insert(user).values({
        id: finalUserId,
        name: invite.email.split('@')[0],
        email: invite.email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Create session
    const { session: sessionTable } = await import('../db/schema.js');
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + 7);

    await db.insert(sessionTable).values({
      id: crypto.randomUUID(),
      token: sessionToken,
      expiresAt: sessionExpiresAt,
      userId: finalUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      userAgent: c.req.header('user-agent') || 'Codeward-Passwordless-Auth',
    });

    // Mark invite accepted
    await db.update(workspaceInvite).set({ status: 'accepted' }).where(eq(workspaceInvite.id, invite.id));

    // Add user as member of workspace
    await db.insert(workspaceMember).values({
      workspaceId: invite.workspaceId,
      userId: finalUserId,
      role: invite.role
    }).onConflictDoNothing();

    // Record when joined in Audit Log
    await db.insert(workspaceAuditLog).values({
      workspaceId: invite.workspaceId,
      userId: finalUserId,
      actorName: invite.email.split('@')[0],
      action: `${invite.email} accepted invitation and joined workspace as ${invite.role}`,
      ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
      status: 'success'
    });

    // Record initial daily login
    const today = new Date().toISOString().split('T')[0];
    await db
      .insert(workspaceDailyLogin)
      .values({
        workspaceId: invite.workspaceId,
        userId: finalUserId,
        loginDate: today,
        loginCount: 1,
        lastLoginAt: new Date()
      })
      .onConflictDoUpdate({
        target: [workspaceDailyLogin.workspaceId, workspaceDailyLogin.userId, workspaceDailyLogin.loginDate],
        set: {
          loginCount: sql`${workspaceDailyLogin.loginCount} + 1`,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        }
      });

    c.header('Set-Cookie', `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);

    return c.json({
      message: 'Workspace invitation accepted successfully! Logging you in...',
      workspaceId: invite.workspaceId,
      role: invite.role,
      userId: finalUserId
    });
  } catch (err: any) {
    console.error('[Workspaces] Accept Invite error:', err);
    return c.json({ error: 'Failed to accept invitation', details: err.message }, 500);
  }
});

// ── 8. Record Daily Workspace Login Activity
workspacesRouter.post('/:id/record-login', async (c) => {
  try {
    const userId = await getUserId(c);
    const workspaceId = c.req.param('id');

    // RBAC: Verify user is a member of this workspace
    await checkWorkspaceRole(workspaceId, userId, ['owner', 'admin', 'developer', 'member', 'viewer']);

    const todayDate = new Date().toISOString().split('T')[0];

    // Check if user already logged in today
    const [existing] = await db
      .select()
      .from(workspaceDailyLogin)
      .where(
        and(
          eq(workspaceDailyLogin.workspaceId, workspaceId),
          eq(workspaceDailyLogin.userId, userId),
          eq(workspaceDailyLogin.loginDate, todayDate)
        )
      );

    if (existing) {
      await db
        .update(workspaceDailyLogin)
        .set({
          loginCount: existing.loginCount + 1,
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(workspaceDailyLogin.id, existing.id));

      return c.json({ success: true, count: existing.loginCount + 1, date: todayDate });
    } else {
      await db.insert(workspaceDailyLogin).values({
        workspaceId,
        userId,
        loginDate: todayDate,
        loginCount: 1,
        lastLoginAt: new Date()
      });

      // On first login of the day, log in audit log
      const [currentUser] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, userId));
      await db.insert(workspaceAuditLog).values({
        workspaceId,
        userId,
        actorName: currentUser?.name || 'Member',
        action: `Member ${currentUser?.email || currentUser?.name || 'User'} logged in (first session today)`,
        ipAddress: c.req.header('x-forwarded-for') || '127.0.0.1',
        status: 'success'
      });

      return c.json({ success: true, count: 1, date: todayDate });
    }
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'Not a member of this workspace' }, 403);
    }
    return c.json({ error: 'Failed to record login', details: err.message }, 500);
  }
});

// ── 9. Get Chronological Audit & Activity Logs with Daily Login Summary
workspacesRouter.get('/:id/logs', async (c) => {
  try {
    const userId = await getUserId(c);
    const workspaceId = c.req.param('id');
    
    // RBAC: Only Owners and Admins can view audit logs
    await checkWorkspaceRole(workspaceId, userId, ['owner', 'admin']);
    
    // Chronological logs
    const logs = await db
      .select()
      .from(workspaceAuditLog)
      .where(eq(workspaceAuditLog.workspaceId, workspaceId))
      .orderBy(desc(workspaceAuditLog.createdAt))
      .limit(100);

    // Daily login history (grouped by day and member)
    const dailyLogins = await db
      .select({
        id: workspaceDailyLogin.id,
        userId: workspaceDailyLogin.userId,
        loginDate: workspaceDailyLogin.loginDate,
        loginCount: workspaceDailyLogin.loginCount,
        lastLoginAt: workspaceDailyLogin.lastLoginAt,
        userName: user.name,
        userEmail: user.email
      })
      .from(workspaceDailyLogin)
      .leftJoin(user, eq(workspaceDailyLogin.userId, user.id))
      .where(eq(workspaceDailyLogin.workspaceId, workspaceId))
      .orderBy(desc(workspaceDailyLogin.loginDate), desc(workspaceDailyLogin.lastLoginAt))
      .limit(50);
      
    return c.json({ logs, dailyLogins });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (err.message === 'FORBIDDEN') {
      return c.json({ error: 'You do not have permission to view audit logs for this workspace' }, 403);
    }
    console.error('[Workspaces] Logs error:', err);
    return c.json({ error: 'Failed to fetch audit logs', details: err.message }, 500);
  }
});
