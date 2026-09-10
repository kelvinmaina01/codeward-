CREATE INDEX IF NOT EXISTS "agent_tasks_run_id_idx" ON "agent_tasks" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_logs_repo_id_ts_ms_idx" ON "run_logs" USING btree ("repo_id","ts_ms");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "run_logs_run_id_ts_ms_idx" ON "run_logs" USING btree ("run_id","ts_ms");