-- Backfills migration history for two tables that were added to the live DB via `drizzle-kit
-- push` (never captured as a numbered migration): merge_approvals and demo_leads. Both already
-- exist live and are in active use (Gordon's approve_and_merge/list_pending_approvals, the
-- merge-approval dashboard, and the demo-booking lead form) — this file exists purely to make
-- `drizzle-kit migrate` reconstruct the real schema from scratch on a fresh DB. IF NOT EXISTS
-- makes it a genuine no-op everywhere it's already applied.
CREATE TABLE IF NOT EXISTS "merge_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL,
	"run_id" integer,
	"agent_id" varchar(100) NOT NULL,
	"pull_request_number" integer NOT NULL,
	"pr_url" text,
	"pr_title" text,
	"guardian_verdict" varchar(30),
	"max_severity" varchar(20),
	"mode" varchar(20) DEFAULT 'manual' NOT NULL,
	"deadline_at" timestamp,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"decided_by" text,
	"decision_note" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merge_approvals" ADD CONSTRAINT "merge_approvals_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merge_approvals" ADD CONSTRAINT "merge_approvals_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demo_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"team_size" varchar(50) NOT NULL,
	"git_provider" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
