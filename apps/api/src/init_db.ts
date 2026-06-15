import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_reports (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id       TEXT NOT NULL,
      agent_type   TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      severity     TEXT,
      findings     JSONB DEFAULT '[]',
      completed_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agent_reports_run_id ON agent_reports(run_id);
  `);
  console.log("agent_reports table created.");
  process.exit(0);
}
run();
