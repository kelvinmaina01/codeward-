import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Running manual migration to add columns...');
  try {
    await db.execute(sql`
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "github_repo_id" integer;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "installation_id" integer;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'pending_audit' NOT NULL;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "audit_triggered_at" timestamp;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "audit_completed_at" timestamp;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS "baseline_score" integer;
    `);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

run();
