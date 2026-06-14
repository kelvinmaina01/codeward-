CREATE TABLE "agent_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text,
	"agent_type" text NOT NULL,
	"memory_type" text NOT NULL,
	"file_path" text,
	"summary" text NOT NULL,
	"confidence" real DEFAULT 0.5,
	"use_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"agent_id" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider" varchar(50) DEFAULT 'anthropic',
	"model" varchar(100),
	"score" integer,
	"findings_count" integer DEFAULT 0,
	"findings" jsonb,
	"token_usage" jsonb,
	"duration" integer,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;