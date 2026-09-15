/**
 * Phase 1 Database & Safety Hardening Verification Suite
 * 
 * Verifies:
 * 1. DB-013: Destructive Script protection (refusal under NODE_ENV=production and unconfirmed runs)
 * 2. DB-011: Connection Pool Starvation (pool size configuration and separation of HTTP vs Worker db clients)
 * 3. DB-008/009: Foreign Key Cascades (onDelete: 'cascade' on repositories.userId and runs.repoId)
 * 4. DB-001/002: Missing Indexes (runs_repo_id_idx, runs_repo_id_created_at_idx in schema and migration SQL)
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runPhase1Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 1: DATABASE & SAFETY HARDENING TESTS');
  console.log('======================================================\n');

  // ─── Test 1: DB-013 Destructive Script Protection ───
  console.log('--- Test 1: DB-013 Destructive Script Safety ---');
  try {
    // Attempting to run migrate.ts with NODE_ENV=production should FAIL immediately with exit code 1
    let threwProd = false;
    try {
      execSync('npx tsx src/migrate.ts', {
        cwd: apiRoot,
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: 'pipe',
      });
    } catch (e: any) {
      threwProd = true;
      const output = (e.stderr?.toString() || '') + (e.stdout?.toString() || '');
      assert(
        output.includes('FATAL: Refusing to run destructive migrate.ts in production environment') ||
        output.includes('Refusing to run destructive'),
        'migrate.ts aborts immediately in production mode',
        output
      );
    }
    assert(threwProd, 'migrate.ts exits non-zero when NODE_ENV=production');

    // Attempting to run migrate.ts without CONFIRM_DESTRUCTIVE_MIGRATION should also FAIL
    let threwWithoutConfirm = false;
    try {
      execSync('npx tsx src/migrate.ts', {
        cwd: apiRoot,
        env: { ...process.env, NODE_ENV: 'development', CONFIRM_DESTRUCTIVE_MIGRATION: 'false' },
        stdio: 'pipe',
      });
    } catch (e: any) {
      threwWithoutConfirm = true;
      const output = (e.stderr?.toString() || '') + (e.stdout?.toString() || '');
      assert(
        output.includes('BLOCKED: migrate.ts drops customer data tables'),
        'migrate.ts blocks unconfirmed local execution without confirmation flag',
        output
      );
    }
    assert(threwWithoutConfirm, 'migrate.ts exits non-zero without CONFIRM_DESTRUCTIVE_MIGRATION=true');
  } catch (err: any) {
    assert(false, 'DB-013 test execution error', err.message);
  }

  // ─── Test 2: DB-011 Connection Pool Starvation & Separation ───
  console.log('\n--- Test 2: DB-011 Connection Pool & Client Separation ---');
  try {
    const dbIndexContent = fs.readFileSync(path.join(apiRoot, 'src/db/index.ts'), 'utf8');
    assert(dbIndexContent.includes('export const DB_POOL_MAX ='), 'DB_POOL_MAX is configured in src/db/index.ts');
    assert(dbIndexContent.includes('export const WORKER_DB_POOL_MAX ='), 'WORKER_DB_POOL_MAX is configured in src/db/index.ts');
    assert(dbIndexContent.includes('export const workerDb ='), 'Separate workerDb client exported for background workers');
    assert(dbIndexContent.includes('export const db ='), 'Dedicated db client exported for HTTP API');

    // Check that worker files actually import workerDb
    const agentQueueContent = fs.readFileSync(path.join(apiRoot, 'src/agents/queue/agent.queue.ts'), 'utf8');
    assert(agentQueueContent.includes('workerDb as db') || agentQueueContent.includes('workerDb'), 'agent.queue.ts imports and uses workerDb');

    const webhookQueueContent = fs.readFileSync(path.join(apiRoot, 'src/queue/webhook.queue.ts'), 'utf8');
    assert(webhookQueueContent.includes('workerDb as db') || webhookQueueContent.includes('workerDb'), 'webhook.queue.ts imports and uses workerDb');

    // Dynamic runtime import check
    const { DB_POOL_MAX, WORKER_DB_POOL_MAX, db, workerDb } = await import('../src/db/index.js');
    assert(DB_POOL_MAX >= 20, `DB_POOL_MAX (${DB_POOL_MAX}) >= 20`);
    assert(WORKER_DB_POOL_MAX >= 20, `WORKER_DB_POOL_MAX (${WORKER_DB_POOL_MAX}) >= 20`);
    assert(db !== workerDb, 'HTTP db and workerDb are distinct instances');
  } catch (err: any) {
    assert(false, 'DB-011 test execution error', err.message);
  }

  // ─── Test 3: DB-008/009 Foreign Key Cascades ───
  console.log('\n--- Test 3: DB-008/009 Foreign Key Cascades ---');
  try {
    const schemaContent = fs.readFileSync(path.join(apiRoot, 'src/db/schema.ts'), 'utf8');
    // Check repositories.userId has onDelete: 'cascade'
    const userRefMatch = /userId:\s*text\(['"]user_id['"]\)\.notNull\(\)\.references\(\(\)\s*=>\s*user\.id,\s*\{\s*onDelete:\s*['"]cascade['"]\s*\}\)/.test(schemaContent);
    assert(userRefMatch, 'repositories.userId has onDelete: "cascade" in schema.ts');

    // Check runs.repoId has onDelete: 'cascade'
    const repoRefMatch = /repoId:\s*integer\(['"]repo_id['"]\)\.references\(\(\)\s*=>\s*repositories\.id,\s*\{\s*onDelete:\s*['"]cascade['"]\s*\}\)/.test(schemaContent);
    assert(repoRefMatch, 'runs.repoId has onDelete: "cascade" in schema.ts');

    // Check runtime schema exported columns
    const schemaModule = await import('../src/db/schema.js');
    assert(schemaModule.repositories !== undefined, 'repositories table exported');
    assert(schemaModule.runs !== undefined, 'runs table exported');
  } catch (err: any) {
    assert(false, 'DB-008/009 test execution error', err.message);
  }

  // ─── Test 4: DB-001/002 Missing Indexes & Migration File ───
  console.log('\n--- Test 4: DB-001/002 Missing Indexes ---');
  try {
    const schemaContent = fs.readFileSync(path.join(apiRoot, 'src/db/schema.ts'), 'utf8');
    assert(schemaContent.includes("repoIdIdx: index('runs_repo_id_idx').on(table.repoId)"), 'runs_repo_id_idx defined in schema.ts');
    assert(schemaContent.includes("repoIdCreatedAtIdx: index('runs_repo_id_created_at_idx').on(table.repoId, table.createdAt)"), 'runs_repo_id_created_at_idx defined in schema.ts');

    // Check migration file 0019 exists and defines the indexes and cascades
    const migrationPath = path.join(apiRoot, 'drizzle/0019_add_missing_indexes_and_cascades.sql');
    assert(fs.existsSync(migrationPath), 'Migration 0019_add_missing_indexes_and_cascades.sql exists');

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    assert(migrationContent.includes('CREATE INDEX IF NOT EXISTS "runs_repo_id_idx"'), 'Migration creates runs_repo_id_idx');
    assert(migrationContent.includes('CREATE INDEX IF NOT EXISTS "runs_repo_id_created_at_idx"'), 'Migration creates runs_repo_id_created_at_idx');
    assert(migrationContent.includes('ON DELETE cascade'), 'Migration updates foreign keys with ON DELETE cascade');
  } catch (err: any) {
    assert(false, 'DB-001/002 test execution error', err.message);
  }

  console.log('\n======================================================');
  console.log(`📊 PHASE 1 RESULTS: ${passedTests}/${totalTests} tests passed (${failedTests} failed)`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((e) => {
  console.error('Fatal error during Phase 1 testing:', e);
  process.exit(1);
});
