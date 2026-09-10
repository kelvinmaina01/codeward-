ALTER TABLE "escalated_findings" ADD COLUMN "agent_id" varchar(100);--> statement-breakpoint
ALTER TABLE "escalated_findings" ADD COLUMN "file" text;--> statement-breakpoint
ALTER TABLE "escalated_findings" ADD COLUMN "last_commented_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "escalated_findings_repo_fingerprint_open_idx" ON "escalated_findings" USING btree ("repo_id","fingerprint") WHERE status = 'open';