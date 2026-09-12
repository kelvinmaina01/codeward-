import { db } from './index.js';
import { sql } from 'drizzle-orm';

/**
 * Manual migration: Add Polar billing fields + lifetime trial counter
 * to the organization table.
 *
 * Run with:  npx tsx src/db/migrate-polar.ts
 */
async function run() {
  console.log('[migrate-polar] Running migration...');
  try {
    await db.execute(sql`
      -- Polar billing fields
      ALTER TABLE "organization"
        ADD COLUMN IF NOT EXISTS "polar_customer_id"     varchar(255),
        ADD COLUMN IF NOT EXISTS "polar_subscription_id" varchar(255),
        ADD COLUMN IF NOT EXISTS "polar_product_id"      varchar(255);

      -- Lifetime trial counter (free tier only)
      -- trial_prs_used: counts DISTINCT PR numbers ever scanned (force-push
      --   to the same PR does NOT increment — de-duplicated at gate level)
      -- trial_pr_limit: per-org override (default 10)
      ALTER TABLE "organization"
        ADD COLUMN IF NOT EXISTS "trial_prs_used" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "trial_pr_limit"  integer NOT NULL DEFAULT 10;
    `);
    console.log('[migrate-polar] ✅ Migration successful!');
  } catch (error) {
    console.error('[migrate-polar] ❌ Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

run();
