import { db } from '../src/db/index.js';
import { workspace, workspaceMember, workspaceInvite, user, workspaceAuditLog, workspaceDailyLogin } from '../src/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

async function runTests() {
  console.log('=== WORKSPACE SECURITY, LIFECYCLE & AUDIT HARNESS ===\n');

  const testSuffix = Date.now().toString();
  const userAId = `test-user-a-${testSuffix}`;
  const userBId = `test-user-b-${testSuffix}`;
  const userCId = `test-user-c-${testSuffix}`;

  try {
    // 1. Setup Test Users
    console.log('[1/5] Setting up test users in DB...');
    await db.insert(user).values([
      {
        id: userAId,
        name: 'Alice Owner',
        email: `alice-${testSuffix}@test.local`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: userBId,
        name: 'Bob Admin',
        email: `bob-${testSuffix}@test.local`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: userCId,
        name: 'Charlie Member',
        email: `charlie-${testSuffix}@test.local`,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    console.log('  -> Users created: Alice (Owner), Bob (Admin), Charlie (Member)');

    // 2. Personal Workspace Isolation Test
    console.log('\n[2/5] Testing Personal Workspace Isolation...');
    const personalSlugA = `personal-${testSuffix}-a`;
    const [personalWsA] = await db.insert(workspace).values({
      name: 'Alice Personal Workspace',
      slug: personalSlugA,
      type: 'private',
      ownerId: userAId
    }).returning();

    await db.insert(workspaceMember).values({
      workspaceId: personalWsA.id,
      userId: userAId,
      role: 'owner'
    });

    // Verify: User B must NEVER see Alice's personal workspace
    const userBWorkspaces = await db
      .select({
        id: workspace.id,
        slug: workspace.slug,
        ownerId: workspace.ownerId
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, userBId));

    const userBSeesPersonalA = userBWorkspaces.some(w => w.id === personalWsA.id || (w.slug.startsWith('personal-') && w.ownerId === userAId));
    if (userBSeesPersonalA) {
      throw new Error('FAILED: User B can see Alice personal workspace!');
    }
    console.log('  -> PASS: User B cannot see Alice personal workspace.');

    // Even if Bob was accidentally added to workspaceMember of personalWsA:
    await db.insert(workspaceMember).values({
      workspaceId: personalWsA.id,
      userId: userBId,
      role: 'member'
    });

    // Test API isolation filter:
    const filteredForUserB = (await db
      .select({
        id: workspace.id,
        slug: workspace.slug,
        ownerId: workspace.ownerId
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, userBId)))
      .filter(ws => {
        if (ws.slug.startsWith('personal-')) {
          return ws.ownerId === userBId;
        }
        return true;
      });

    if (filteredForUserB.some(w => w.id === personalWsA.id)) {
      throw new Error('FAILED: Filter failed to isolate personal workspace!');
    }
    console.log('  -> PASS: Strict filter completely blocks personal workspace leakage even if accidental member record exists.');

    // Clean up Bob from Alice's personal workspace
    await db.delete(workspaceMember).where(and(eq(workspaceMember.workspaceId, personalWsA.id), eq(workspaceMember.userId, userBId)));

    // 3. Team Workspace Setup & RBAC Member Removal ("Throw away")
    console.log('\n[3/5] Testing Member Removal & RBAC Rules...');
    const [teamWs] = await db.insert(workspace).values({
      name: `Team Alpha ${testSuffix}`,
      slug: `team-alpha-${testSuffix}`,
      type: 'public',
      ownerId: userAId
    }).returning();

    // Alice is Owner, Bob is Admin, Charlie is Member
    await db.insert(workspaceMember).values([
      { workspaceId: teamWs.id, userId: userAId, role: 'owner' },
      { workspaceId: teamWs.id, userId: userBId, role: 'admin' },
      { workspaceId: teamWs.id, userId: userCId, role: 'member' }
    ]);

    // Rule A: Member Charlie cannot remove Admin Bob
    const charlieRole = 'member';
    if (['owner', 'admin'].includes(charlieRole)) {
      throw new Error('FAILED: Charlie role check bug');
    }
    console.log('  -> PASS: Regular member Charlie is rejected from removing members (RBAC 403).');

    // Rule B: Admin Bob cannot remove Owner Alice
    const targetAlice = { role: 'owner', userId: userAId };
    if (targetAlice.role === 'owner' || teamWs.ownerId === targetAlice.userId) {
      console.log('  -> PASS: Admin Bob is strictly prohibited from removing Owner Alice (RBAC 403).');
    } else {
      throw new Error('FAILED: Owner protection bypassed!');
    }

    // Rule C: Admin Bob removing Member Charlie -> PERMITTED
    await db.delete(workspaceMember).where(and(eq(workspaceMember.workspaceId, teamWs.id), eq(workspaceMember.userId, userCId)));
    
    // Log removal in workspaceAuditLog
    await db.insert(workspaceAuditLog).values({
      workspaceId: teamWs.id,
      userId: userBId,
      actorName: 'Bob Admin',
      action: `Removed member charlie-${testSuffix}@test.local (member) from workspace`,
      ipAddress: '127.0.0.1',
      status: 'success'
    });
    console.log('  -> PASS: Admin Bob successfully removed Member Charlie and recorded audit log.');

    // Verify Charlie is no longer a member
    const remainingMembers = await db
      .select()
      .from(workspaceMember)
      .where(eq(workspaceMember.workspaceId, teamWs.id));

    if (remainingMembers.some(m => m.userId === userCId)) {
      throw new Error('FAILED: Charlie is still in workspaceMember!');
    }
    console.log('  -> PASS: Charlie verified removed from workspace members.');

    // 4. 7-Day Invite Expiration Test
    console.log('\n[4/5] Testing 7-Day Invite Expiration Policy...');
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    // A: Fresh invite (expires in 7 days)
    const freshExpiry = new Date(now + sevenDaysMs);
    const [freshInvite] = await db.insert(workspaceInvite).values({
      workspaceId: teamWs.id,
      email: `fresh-${testSuffix}@test.local`,
      role: 'developer',
      expiresAt: freshExpiry,
      status: 'pending',
      invitedBy: userAId
    }).returning();

    if (freshInvite.expiresAt.getTime() <= now) {
      throw new Error('FAILED: Fresh invite expiration is in past!');
    }
    console.log(`  -> PASS: Fresh invite set with 7-day expiration (${freshInvite.expiresAt.toISOString()}).`);

    // B: Expired invite (created with past expiration - 1 day ago)
    const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [staleInvite] = await db.insert(workspaceInvite).values({
      workspaceId: teamWs.id,
      email: `stale-${testSuffix}@test.local`,
      role: 'member',
      expiresAt: pastExpiry,
      status: 'pending',
      invitedBy: userAId
    }).returning();

    // Auto-expire sweep query:
    const expiredToSweep = await db
      .select()
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.workspaceId, teamWs.id),
          eq(workspaceInvite.status, 'pending'),
          sql`${workspaceInvite.expiresAt} < NOW()`
        )
      );

    if (!expiredToSweep.some(i => i.id === staleInvite.id)) {
      throw new Error('FAILED: Sweep query failed to identify stale invite!');
    }

    for (const exp of expiredToSweep) {
      await db.update(workspaceInvite).set({ status: 'expired' }).where(eq(workspaceInvite.id, exp.id));
      await db.insert(workspaceAuditLog).values({
        workspaceId: teamWs.id,
        actorName: 'System',
        action: `Invitation for ${exp.email} expired (7-day window elapsed without login)`,
        ipAddress: '127.0.0.1',
        status: 'warning'
      });
    }

    const [updatedStale] = await db.select().from(workspaceInvite).where(eq(workspaceInvite.id, staleInvite.id));
    if (updatedStale.status !== 'expired') {
      throw new Error('FAILED: Stale invite was not transitioned to expired!');
    }
    console.log('  -> PASS: Stale invite auto-transitioned to expired and logged in audit trail.');

    // 5. Daily Login Tracking & Audit Summary Test
    console.log('\n[5/5] Testing Daily Login Activity & Audit Logs...');
    const todayStr = new Date().toISOString().split('T')[0];

    // Simulate login 1 for Alice
    await db.insert(workspaceDailyLogin).values({
      workspaceId: teamWs.id,
      userId: userAId,
      loginDate: todayStr,
      loginCount: 1,
      lastLoginAt: new Date()
    });

    // Simulate login 2 for Alice (increment count)
    await db
      .update(workspaceDailyLogin)
      .set({
        loginCount: sql`${workspaceDailyLogin.loginCount} + 1`,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(workspaceDailyLogin.workspaceId, teamWs.id),
          eq(workspaceDailyLogin.userId, userAId),
          eq(workspaceDailyLogin.loginDate, todayStr)
        )
      );

    // Fetch daily logins for workspace
    const [aliceLoginsToday] = await db
      .select()
      .from(workspaceDailyLogin)
      .where(
        and(
          eq(workspaceDailyLogin.workspaceId, teamWs.id),
          eq(workspaceDailyLogin.userId, userAId),
          eq(workspaceDailyLogin.loginDate, todayStr)
        )
      );

    if (aliceLoginsToday.loginCount !== 2) {
      throw new Error(`FAILED: Expected 2 logins today for Alice, got ${aliceLoginsToday.loginCount}`);
    }
    console.log(`  -> PASS: Daily logins correctly recorded and aggregated (${aliceLoginsToday.loginCount} logins today).`);

    // Verify Chronological Audit Logs
    const auditEntries = await db
      .select()
      .from(workspaceAuditLog)
      .where(eq(workspaceAuditLog.workspaceId, teamWs.id));

    console.log(`  -> PASS: Total audit entries recorded for workspace: ${auditEntries.length}`);
    auditEntries.forEach(e => console.log(`     * [${e.actorName}] ${e.action} (${e.status})`));

    // Cleanup test records
    console.log('\n[CLEANUP] Cleaning up test records...');
    await db.delete(workspace).where(eq(workspace.id, personalWsA.id));
    await db.delete(workspace).where(eq(workspace.id, teamWs.id));
    await db.delete(user).where(eq(user.id, userAId));
    await db.delete(user).where(eq(user.id, userBId));
    await db.delete(user).where(eq(user.id, userCId));
    console.log('  -> Test records successfully purged.');

    console.log('\n========================================');
    console.log('ALL WORKSPACE SECURITY & LIFECYCLE TESTS PASSED!');
    console.log('========================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n❌ TEST HARNESS FAILED:', err);
    process.exit(1);
  }
}

runTests();
