import { Hono } from 'hono';
import { db } from '../db/index.js';
import { workspace, workspaceMember, workspaceInvite, user } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { verifyEmailRealTime } from '../services/email-verifier.js';
import { sendWorkspaceInviteOtp } from '../services/email-sender.js';

export const workspacesRouter = new Hono();

// Helper to get or mock user ID for requests
function getUserId(c: any): string {
  // Better Auth or header or fallback dummy user
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('User ')) {
    return authHeader.replace('User ', '');
  }
  return 'user-default-1';
}

// ── 1. List user's workspaces (Auto-creates personal workspace if none exist)
workspacesRouter.get('/', async (c) => {
  try {
    const userId = getUserId(c);

    // Find all workspaces where user is owner or member
    const userWorkspaces = await db
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

    if (userWorkspaces.length === 0) {
      // Auto-create Personal Workspace
      const personalSlug = `personal-${Date.now()}`;
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
    console.error('[Workspaces] List error:', err);
    return c.json({ error: 'Failed to fetch workspaces', details: err.message }, 500);
  }
});

// ── 2. Create a new workspace
workspacesRouter.post('/', async (c) => {
  try {
    const userId = getUserId(c);
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

    return c.json({
      message: 'Workspace created successfully',
      workspace: { ...newWs, role: 'owner' }
    }, 201);
  } catch (err: any) {
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

// ── 3. Get Workspace Members
workspacesRouter.get('/:id/members', async (c) => {
  try {
    const workspaceId = c.req.param('id');

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

    const invites = await db
      .select()
      .from(workspaceInvite)
      .where(and(eq(workspaceInvite.workspaceId, workspaceId), eq(workspaceInvite.status, 'pending')));

    return c.json({ members, pendingInvites: invites });
  } catch (err: any) {
    console.error('[Workspaces] Members error:', err);
    return c.json({ error: 'Failed to fetch workspace members', details: err.message }, 500);
  }
});

// ── 4. Invite user(s) to Workspace with custom per-person roles
workspacesRouter.post('/:id/invites', async (c) => {
  try {
    const userId = getUserId(c);
    const workspaceId = c.req.param('id');
    const body = await c.req.json();

    // Support both batch array ({ invites: [{ email, role }] }) and single ({ email, role })
    let inviteItems: { email: string; role: string }[] = [];
    if (Array.isArray(body.invites)) {
      inviteItems = body.invites;
    } else if (body.email) {
      inviteItems = [{ email: body.email, role: body.role || 'member' }];
    }

    if (inviteItems.length === 0) {
      return c.json({ error: 'At least one invite with email and role is required' }, 400);
    }

    // Check workspace existence
    const [targetWs] = await db.select().from(workspace).where(eq(workspace.id, workspaceId));
    if (!targetWs) {
      return c.json({ error: 'Workspace not found' }, 404);
    }

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

      // Generate 6-digit numeric OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

      // Save Invite in Database
      const [inviteRecord] = await db
        .insert(workspaceInvite)
        .values({
          workspaceId,
          email: cleanEmail,
          role: cleanRole,
          otp: otpCode,
          expiresAt,
          status: 'pending',
          invitedBy: userId
        })
        .returning();

      // Send OTP Email via Resend API
      const emailResult = await sendWorkspaceInviteOtp({
        toEmail: cleanEmail,
        workspaceName: targetWs.name,
        inviterName: 'Codeward Admin',
        otpCode,
        role: cleanRole
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
    console.error('[Workspaces] Invite error:', err);
    return c.json({ error: 'Failed to process workspace invites', details: err.message }, 500);
  }
});

// ── 5. Verify OTP & Accept Workspace Invite (Option B Flow)
workspacesRouter.post('/verify-otp', async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return c.json({ error: 'Email and OTP code are required' }, 400);
    }

    // Find pending invite
    const [invite] = await db
      .select()
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.email, email.trim().toLowerCase()),
          eq(workspaceInvite.otp, otp.trim()),
          eq(workspaceInvite.status, 'pending')
        )
      );

    if (!invite) {
      return c.json({ error: 'Invalid or expired OTP code' }, 400);
    }

    if (new Date() > new Date(invite.expiresAt)) {
      await db.update(workspaceInvite).set({ status: 'expired' }).where(eq(workspaceInvite.id, invite.id));
      return c.json({ error: 'OTP code has expired' }, 400);
    }

    // Mark invite accepted
    await db.update(workspaceInvite).set({ status: 'accepted' }).where(eq(workspaceInvite.id, invite.id));

    // Add user as member of workspace
    await db.insert(workspaceMember).values({
      workspaceId: invite.workspaceId,
      userId: userId,
      role: invite.role
    });

    return c.json({
      message: 'Workspace invitation accepted successfully!',
      workspaceId: invite.workspaceId,
      role: invite.role
    });
  } catch (err: any) {
    console.error('[Workspaces] OTP Verification error:', err);
    return c.json({ error: 'OTP verification failed', details: err.message }, 500);
  }
});
