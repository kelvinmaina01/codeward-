CREATE TABLE "escalated_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"github_issue_number" integer,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"reason" varchar(50) NOT NULL,
	"reason_detail" text,
	"first_escalated_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"run_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escalated_findings" ADD CONSTRAINT "escalated_findings_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalated_findings" ADD CONSTRAINT "escalated_findings_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "escalated_findings_fingerprint_idx" ON "escalated_findings" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "escalated_findings_repo_status_idx" ON "escalated_findings" USING btree ("repo_id","status");