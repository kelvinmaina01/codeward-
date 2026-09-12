import crypto from 'crypto';
import { Hono } from 'hono';
import { webhookRouter } from '../src/routes/webhooks.js';
import { db } from '../src/db/index.js';
import { organization, repositories, runs, organizationMember } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { triggerComprehensiveAudit } from '../src/agents/audit-trigger.js';

const app = new Hono();
app.route('/api/webhooks', webhookRouter);

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function signGithubPayload(payload: string, secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-secret'): string {
  const hmac = crypto.createHmac('sha256', secret);
  return 'sha256=' + hmac.update(payload).digest('hex');
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE GITHUB WEBHOOK & AUDIT TEST SUITE');
  console.log('=============================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const testUserId = `test-user-${testSuffix}`;
  const testOrgLogin = `test-webhook-org-${testSuffix}`;
  const testRepoName = `test-owner/test-webhook-repo-${testSuffix}`;

  let createdOrgId: number | null = null;
  let createdRepoId: number | null = null;

  try {
    // 0. Seed test user, organization, and connected repository
    console.log('--- Setup: Seeding test user, organization and connected repo ---');
    const { user: userTable } = await import('../src/db/schema.js');

    await db.insert(userTable).values({
      id: testUserId,
      name: 'Webhook Test User',
      email: `test-${testSuffix}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [testOrg] = await db.insert(organization).values({
      githubLogin: testOrgLogin,
      planType: 'free',
      prQuotaLimit: 10,
      trialPrLimit: 5,
      trialPrsUsed: 0,
    }).returning();
    createdOrgId = testOrg.id;

    await db.insert(organizationMember).values({
      orgId: testOrg.id,
      userId: testUserId,
      role: 'owner',
    });

    const [testRepo] = await db.insert(repositories).values({
      name: `test-webhook-repo-${testSuffix}`,
      fullName: testRepoName,
      owner: 'test-owner',
      status: 'active',
      userId: testUserId,
      orgId: testOrg.id,
      installationId: 999888,
    }).returning();
    createdRepoId = testRepo.id;

    assert(Boolean(createdOrgId && createdRepoId), 'Seeded test org & connected repo');

    // ─── Test Group 1: Security & Signature Verification ──────────────────────────
    console.log('\n--- Test Group 1: Signature Verification & Security ---');
    {
      const payload = JSON.stringify({ action: 'ping' });
      const badRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'ping',
          'x-hub-signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        },
        body: payload,
      });

      assert(badRes.status === 401, 'Rejects invalid HMAC signature with 401');
      const badData = await badRes.json() as any;
      assert(badData.error === 'Invalid signature', 'Returns invalid signature error');

      const missingSigRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'ping',
        },
        body: payload,
      });
      assert(missingSigRes.status === 401, 'Rejects missing signature header with 401');
    }

    // ─── Test Group 2: Commit Push Handling (PR-only Policy) ──────────────────────
    console.log('\n--- Test Group 2: Commit Push Handling (PR-only Policy) ---');
    {
      const pushPayload = JSON.stringify({
        repository: { full_name: testRepoName },
        after: '9f8e7d6c5b4a',
      });
      const pushRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'push',
          'x-hub-signature-256': signGithubPayload(pushPayload),
        },
        body: pushPayload,
      });

      assert(pushRes.status === 200, 'Push webhook returns HTTP 200');
      const pushData = await pushRes.json() as any;
      assert(pushData.status === 'ignored', 'Push event is ignored');
      assert(pushData.reason === 'commit_push_scans_disabled_pr_only', 'Ignored with PR-only policy reason');

      const runsForPush = await db.select().from(runs).where(eq(runs.commitSha, '9f8e7d6c5b4a'));
      assert(runsForPush.length === 0, 'Zero runs created for commit pushes');
    }

    // ─── Test Group 3: Pull Request Filters (Bots & Disconnected Repos) ───────────
    console.log('\n--- Test Group 3: Pull Request Pre-Filters ---');
    {
      // A. Disconnected repo
      const disconnectedPr = JSON.stringify({
        action: 'opened',
        pull_request: { number: 1, head: { sha: 'commit-disc', ref: 'feature-x' }, user: { type: 'User' } },
        repository: { full_name: 'unknown/unconnected-repo' },
      });
      const discRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': signGithubPayload(disconnectedPr),
        },
        body: disconnectedPr,
      });
      const discData = await discRes.json() as any;
      assert(discData.status === 'ignored' && discData.reason === 'repo not connected', 'Ignores PRs for unconnected repos');

      // B. Bot PR
      const botPr = JSON.stringify({
        action: 'opened',
        pull_request: { number: 2, head: { sha: 'commit-bot', ref: 'codeward/auto-fix-42' }, user: { type: 'Bot' } },
        repository: { full_name: testRepoName },
      });
      const botRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': signGithubPayload(botPr),
        },
        body: botPr,
      });
      const botData = await botRes.json() as any;
      assert(botData.status === 'ignored' && botData.reason === 'own auto-fix PR', 'Ignores Codeward auto-fix / bot PRs');
    }

    // ─── Test Group 4: Valid Pull Request Trigger & Run Creation ─────────────────
    console.log('\n--- Test Group 4: Valid Pull Request Trigger & Run Enqueue ---');
    {
      const validPrSha = `sha-valid-${testSuffix}`;
      const validPr = JSON.stringify({
        action: 'opened',
        pull_request: {
          number: 101,
          head: { sha: validPrSha, ref: 'feat/user-auth' },
          user: { type: 'User' },
        },
        repository: { full_name: testRepoName },
      });

      const prRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': signGithubPayload(validPr),
        },
        body: validPr,
      });

      assert(prRes.status === 200, 'Valid PR webhook returns HTTP 200');
      const prData = await prRes.json() as any;
      assert(prData.status === 'queued', 'PR status is queued');
      assert(prData.type === 'orchestrator', 'PR run type is orchestrator');
      assert(Boolean(prData.runId), 'Returns generated runId');

      const [createdRun] = await db.select().from(runs).where(eq(runs.id, prData.runId));
      assert(Boolean(createdRun), 'Run record persisted in Postgres runs table');
      assert(createdRun?.repoId === createdRepoId, 'Run record associated with correct repo');
      assert(createdRun?.prNumber === 101, 'Run record associated with PR #101');
      assert(createdRun?.status === 'queued', 'Run status is queued');

      const [updatedOrg] = await db.select().from(organization).where(eq(organization.id, createdOrgId!));
      assert(updatedOrg.trialPrsUsed === 1, 'Atomically incremented trialPrsUsed quota for org');
    }

    // ─── Test Group 5: Trial / Quota Exhaustion Gate ──────────────────────────────
    console.log('\n--- Test Group 5: Per-Org Trial / Quota Exhaustion Gate ---');
    {
      // Artificially exhaust trial limit
      await db.update(organization).set({
        trialPrsUsed: 5,
        trialPrLimit: 5,
      }).where(eq(organization.id, createdOrgId!));

      const exhaustedPrSha = `sha-exhausted-${testSuffix}`;
      const exhaustedPr = JSON.stringify({
        action: 'opened',
        pull_request: {
          number: 102, // new PR number
          head: { sha: exhaustedPrSha, ref: 'feat/large-feature' },
          user: { type: 'User' },
        },
        repository: { full_name: testRepoName },
      });

      const exhRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'pull_request',
          'x-hub-signature-256': signGithubPayload(exhaustedPr),
        },
        body: exhaustedPr,
      });

      assert(exhRes.status === 403, 'Exhausted trial PR returns HTTP 403');
      const exhData = await exhRes.json() as any;
      assert(exhData.status === 'ignored', 'Exhausted PR status is ignored');
      assert(exhData.reason === 'free_trial_exhausted', 'Reason is free_trial_exhausted');

      const runsForExhausted = await db.select().from(runs).where(eq(runs.commitSha, exhaustedPrSha));
      assert(runsForExhausted.length === 0, 'No run record created when quota is exhausted');
    }

    // ─── Test Group 6: App Installation & Baseline Re-Audit Trigger ──────────────
    console.log('\n--- Test Group 6: App Installation & Baseline Audit ---');
    {
      const installPayload = JSON.stringify({
        action: 'added',
        installation: { id: 777666 },
        repositories_added: [{ id: 12345, full_name: testRepoName }],
      });

      const installRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'installation_repositories',
          'x-hub-signature-256': signGithubPayload(installPayload),
        },
        body: installPayload,
      });

      assert(installRes.status === 200, 'Installation webhook returns HTTP 200');
      const installData = await installRes.json() as any;
      assert(installData.status === 'ok', 'Installation processed status is ok');
      assert(installData.auditsTriggered === 1, 'Triggered re-audit for existing connected repo');

      const [reloadedRepo] = await db.select().from(repositories).where(eq(repositories.id, createdRepoId!));
      assert(reloadedRepo.status === 'pending_audit', 'Repository status updated to pending_audit');
      assert(reloadedRepo.installationId === 777666, 'Repository installationId updated');

      const baselineRuns = await db.select().from(runs).where(eq(runs.repoId, createdRepoId!));
      const baselineRun = baselineRuns.find(r => r.commitSha === 'baseline');
      assert(Boolean(baselineRun), 'Baseline audit run record created with commitSha = "baseline"');
      assert(baselineRun?.status === 'queued', 'Baseline run is queued for orchestrator execution');
    }

    // ─── Test Group 7: PR Comments & Codeward Mention Responder ───────────────────
    console.log('\n--- Test Group 7: PR Comments & Codeward Mentions ---');
    {
      // A. Normal comment without mention
      const normalComment = JSON.stringify({
        action: 'created',
        repository: { full_name: testRepoName },
        issue: { number: 101, pull_request: {} },
        comment: { id: 801, body: 'Looks great to me, LGTM!' },
        sender: { type: 'User' },
      });
      const normalRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'issue_comment',
          'x-hub-signature-256': signGithubPayload(normalComment),
        },
        body: normalComment,
      });
      const normalData = await normalRes.json() as any;
      assert(normalData.status === 'ignored' && normalData.reason === 'not an explicit Codeward PR mention', 'Ignores non-Codeward PR comments');

      // B. Codeward mention
      const mentionComment = JSON.stringify({
        action: 'created',
        repository: { full_name: testRepoName },
        issue: { number: 101, pull_request: {} },
        comment: { id: 802, body: '@codeward review this security vulnerability' },
        sender: { type: 'User' },
      });
      const mentionRes = await app.request('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'issue_comment',
          'x-hub-signature-256': signGithubPayload(mentionComment),
        },
        body: mentionComment,
      });
      const mentionData = await mentionRes.json() as any;
      assert(mentionData.status === 'accepted' && mentionData.type === 'codeward_mention', 'Accepts @codeward PR mention for evidence reply');
      assert(mentionData.prNumber === 101, 'Dispatches mention responder for PR #101');
    }

    // ─── Test Group 8: Direct triggerComprehensiveAudit Initial Run Function ─────
    console.log('\n--- Test Group 8: Direct triggerComprehensiveAudit Dispatch ---');
    {
      const auditResult = await triggerComprehensiveAudit(createdRepoId!, testRepoName);
      assert(Boolean(auditResult.runId), 'triggerComprehensiveAudit returns valid runId');

      const [directRun] = await db.select().from(runs).where(eq(runs.id, auditResult.runId));
      assert(directRun?.commitSha === 'baseline', 'Run created with commitSha = "baseline"');
      assert(directRun?.status === 'queued', 'Run created with status = "queued"');
      assert(directRun?.repoId === createdRepoId, 'Run assigned to correct repoId');
    }

  } finally {
    // ─── Cleanup Test Data ────────────────────────────────────────────────────────
    console.log('\n--- Cleanup: Purging test data ---');
    try {
      if (createdRepoId) {
        await db.delete(runs).where(eq(runs.repoId, createdRepoId));
        await db.delete(repositories).where(eq(repositories.id, createdRepoId));
      }
      if (createdOrgId) {
        await db.delete(organizationMember).where(eq(organizationMember.orgId, createdOrgId));
        await db.delete(organization).where(eq(organization.id, createdOrgId));
      }
      const { user: userTable } = await import('../src/db/schema.js');
      await db.delete(userTable).where(eq(userTable.id, testUserId));
      console.log('  🧹 Cleanup complete.');
    } catch (cleanErr: any) {
      console.warn('  ⚠️ Cleanup warning:', cleanErr.message);
    }
  }

  console.log('\n=============================================================');
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
