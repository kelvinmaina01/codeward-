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

      CREATE TABLE IF NOT EXISTS "agent_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "run_id" text NOT NULL,
        "agent_type" text NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "severity" text,
        "findings" jsonb DEFAULT '[]'::jsonb,
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now()
      );

      ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "visibility" varchar(20) DEFAULT 'private' NOT NULL;

      CREATE TABLE IF NOT EXISTS "demo_leads" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "company_name" varchar(255) NOT NULL,
        "team_size" varchar(50) NOT NULL,
        "git_provider" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    console.log('Migration successful!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  process.exit(0);
}

run();
