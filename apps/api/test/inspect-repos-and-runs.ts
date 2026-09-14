import 'dotenv/config';
import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

async function diagnose() {
  console.log('='.repeat(80));
  console.log('🔍 CODEWARD DIAGNOSTICS: REPOS, RUNS, TASKS, QUEUES & FLY.IO');
  console.log('='.repeat(80));

  // 1. Repositories
  console.log('\n[1] REPOSITORIES IN DATABASE:');
  const repos = await db.select().from(schema.repositories).orderBy(desc(schema.repositories.createdAt));
  if (repos.length === 0) {
    console.log('  (No repositories found)');
  } else {
    for (const r of repos) {
      console.log(`  • Repo #${r.id}: ${r.fullName}`);
      console.log(`    - Status: ${r.status}`);
      console.log(`    - Paused: ${r.paused}`);
      console.log(`    - Baseline Score: ${r.baselineScore}`);
      console.log(`    - Audit Triggered: ${r.auditTriggeredAt}`);
      console.log(`    - Audit Completed: ${r.auditCompletedAt}`);
      console.log(`    - Created: ${r.createdAt}`);
    }
  }

  // 2. Runs
  console.log('\n[2] RECENT RUNS:');
  const recentRuns = await db.select().from(schema.runs).orderBy(desc(schema.runs.createdAt)).limit(10);
  if (recentRuns.length === 0) {
    console.log('  (No runs found)');
  } else {
    for (const run of recentRuns) {
      console.log(`  • Run #${run.id} (Repo #${run.repoId}):`);
      console.log(`    - Status: ${run.status}`);
      console.log(`    - Commit SHA: ${run.commitSha}`);
      console.log(`    - Score: ${run.score}`);
      console.log(`    - PR Number: ${run.prNumber}`);
      console.log(`    - Created At: ${run.createdAt}`);
      if (run.rawLogs) {
        console.log(`    - Raw Logs (sample): ${run.rawLogs.slice(0, 200)}...`);
      }
    }
  }

  // 3. Agent Tasks (failures & errors)
  console.log('\n[3] RECENT AGENT TASKS (Failed or Stale):');
  const tasks = await db.select().from(schema.agentTasks).orderBy(desc(schema.agentTasks.createdAt)).limit(20);
  if (tasks.length === 0) {
    console.log('  (No agent tasks found)');
  } else {
    for (const t of tasks) {
      const isFailedOrError = t.status === 'failed' || t.status === 'error' || !!t.error;
      const marker = isFailedOrError ? '❌' : (t.status === 'completed' ? '✅' : '⏳');
      console.log(`  ${marker} Task #${t.id} [Run #${t.runId} / ${t.agentId}]:`);
      console.log(`     - Status: ${t.status}`);
      console.log(`     - Model: ${t.model}`);
      console.log(`     - Error: ${t.error || '(none)'}`);
      if (t.reportMeta) {
        const meta: any = t.reportMeta;
        console.log(`     - Gate: ${meta.gateDecision || 'none'}, Summary: ${meta.summary || 'none'}`);
      }
      console.log(`     - Started: ${t.startedAt}, Completed: ${t.completedAt}`);
    }
  }

  // 4. BullMQ Queues
  console.log('\n[4] BULLMQ QUEUES STATUS:');
  const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 4000 });
  const queueNames = ['agent-runs', 'merge-evaluations', 'repo-analysis', 'email-queue'];

  for (const qName of queueNames) {
    try {
      const q = new Queue(qName, { connection: redis });
      const counts = await q.getJobCounts('waiting', 'active', 'failed', 'delayed', 'completed');
      console.log(`  • Queue "${qName}":`, JSON.stringify(counts));

      // If failed jobs exist, fetch the last 3 failures
      if (counts.failed > 0) {
        const failedJobs = await q.getFailed(0, 2);
        for (const job of failedJobs) {
          console.log(`    ❌ Failed Job ${job.id} (${job.name}):`);
          console.log(`       - Failed Reason: ${job.failedReason}`);
          console.log(`       - Job Data:`, JSON.stringify(job.data).slice(0, 150));
        }
      }

      // If active jobs exist, fetch active
      if (counts.active > 0) {
        const activeJobs = await q.getActive(0, 2);
        for (const job of activeJobs) {
          console.log(`    ⏳ Active Job ${job.id} (${job.name}):`, JSON.stringify(job.data).slice(0, 150));
        }
      }

      // If waiting jobs exist, fetch waiting
      if (counts.waiting > 0) {
        const waitingJobs = await q.getWaiting(0, 2);
        for (const job of waitingJobs) {
          console.log(`    ⏱️ Waiting Job ${job.id} (${job.name}):`, JSON.stringify(job.data).slice(0, 150));
        }
      }

      await q.close();
    } catch (err: any) {
      console.log(`  • Queue "${qName}" error:`, err.message);
    }
  }
  redis.disconnect();

  // 5. Fly.io Sandboxes
  console.log('\n[5] FLY.IO SANDBOXES STATUS:');
  const flyToken = process.env.FLY_API_TOKEN;
  const flyApp = process.env.FLY_APP_NAME || 'codeward-sandboxes-v2';
  const flyImage = process.env.FLY_SANDBOX_IMAGE || 'registry.fly.io/codeward-sandboxes-v2:deployment-01KV13ANZ9AJNNPAXN4A75G44Y';

  console.log(`  • Fly App: ${flyApp}`);
  console.log(`  • Fly Sandbox Image: ${flyImage}`);
  console.log(`  • Fly Token: ${flyToken ? `Present (${flyToken.slice(0, 8)}...)` : 'MISSING'}`);

  if (flyToken) {
    try {
      console.log(`  • Querying Fly.io Machines API for app "${flyApp}"...`);
      const res = await fetch(`https://api.machines.dev/v1/apps/${flyApp}/machines`, {
        headers: {
          'Authorization': `Bearer ${flyToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`  • Fly API HTTP Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        const machines: any = await res.json();
        console.log(`  ✅ Fly Machines API Connected! Found ${Array.isArray(machines) ? machines.length : 0} active machine(s):`);
        if (Array.isArray(machines)) {
          for (const m of machines.slice(0, 5)) {
            console.log(`    - Machine ID: ${m.id}, State: ${m.state}, Region: ${m.region}, Created: ${m.created_at}`);
          }
        }
      } else {
        const errText = await res.text();
        console.log(`  ⚠️ Fly Machines API response: ${errText}`);
      }
    } catch (flyErr: any) {
      console.log(`  ❌ Fly API Error:`, flyErr.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 DIAGNOSTICS COMPLETE');
  console.log('='.repeat(80));
  process.exit(0);
}

diagnose().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
