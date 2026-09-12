import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('[migrate-runs-lifecycle] Running migration...');
  try {
    await db.execute(sql`
      ALTER TABLE "runs"
        ADD COLUMN IF NOT EXISTS "github_check_run_id" bigint,
        ADD COLUMN IF NOT EXISTS "github_status_comment_id" bigint;
    `);
    console.log('[migrate-runs-lifecycle] ✅ Migration successful!');
  } catch (err) {
    console.error('[migrate-runs-lifecycle] ❌ Migration failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

run();
