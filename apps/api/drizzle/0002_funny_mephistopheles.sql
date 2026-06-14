CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"github_login" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organization_github_login_unique" UNIQUE("github_login")
);
--> statement-breakpoint
CREATE TABLE "organization_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "run_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"agent_name" varchar(100) NOT NULL,
	"passed" boolean NOT NULL,
	"output" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_name_unique";--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "org_id" integer;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "github_repo_id" integer;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "installation_id" integer;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "status" varchar(50) DEFAULT 'pending_audit' NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "audit_triggered_at" timestamp;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "audit_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "baseline_score" integer;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "full_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "owner" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "language" varchar(100);--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "config" jsonb DEFAULT '{"agents":{"security":true,"bloat":true,"broken_code":true,"architecture":true,"ai_era":true,"compliance":true,"data_dx":true}}'::jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "raw_logs" text;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_results" ADD CONSTRAINT "run_results_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_full_name_unique" UNIQUE("full_name");