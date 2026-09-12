ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "github_check_run_id" integer;
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "github_status_comment_id" integer;
