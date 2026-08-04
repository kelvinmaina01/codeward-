-- Backfills a missing FK: schema.ts and migration 0003_foamy_northstar.sql both declare
-- agent_tasks.run_id -> runs.id ON DELETE CASCADE, but it was never actually present in the
-- live DB (confirmed via pg_constraint — zero FKs on agent_tasks). Root cause: 0003 was applied
-- via `drizzle-kit push` historically (the same drift class fixed in 0006), and that constraint
-- did not survive. Real impact, caught by stress-testing spawn_agent: deleting a `runs` row
-- while its BullMQ job is still writing to agent_tasks leaves a permanently orphaned row with no
-- error anywhere — 6 such orphans already existed live and were cleaned up before this ran.
DO $$ BEGIN
 ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
