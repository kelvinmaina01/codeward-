CREATE TABLE "alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer,
	"user_id" text,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"severity" varchar(20) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"lines_cleared" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_score" (
	"entity_id" text PRIMARY KEY NOT NULL,
	"entity_type" varchar(10) NOT NULL,
	"org_slug" text,
	"owner_user_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_image" text,
	"score" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_daily_login" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"login_date" varchar(10) NOT NULL,
	"login_count" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT "account_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "runs" DROP CONSTRAINT "runs_repo_id_repositories_id_fk";
--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "polar_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "polar_subscription_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "polar_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "trial_prs_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "trial_pr_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "github_check_run_id" integer;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "github_status_comment_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "leaderboard_opt_in" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_daily_login" ADD CONSTRAINT "workspace_daily_login_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_daily_login" ADD CONSTRAINT "workspace_daily_login_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_stats_entity_date_idx" ON "daily_stats" USING btree ("entity_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_daily_login_ws_user_date_idx" ON "workspace_daily_login" USING btree ("workspace_id","user_id","login_date");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repo_id_repositories_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_repo_id_idx" ON "runs" USING btree ("repo_id");--> statement-breakpoint
CREATE INDEX "runs_repo_id_created_at_idx" ON "runs" USING btree ("repo_id","created_at");