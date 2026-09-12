import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function run() {
  console.log('Running migration to create workspace_daily_login table...');
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "workspace_daily_login" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "workspace_id" uuid NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "login_date" varchar(10) NOT NULL,
        "login_count" integer DEFAULT 1 NOT NULL,
        "last_login_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "workspace_daily_login_ws_user_date_idx" 
      ON "workspace_daily_login" ("workspace_id", "user_id", "login_date");
    `);
    console.log('Migration for workspace_daily_login completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

run();
