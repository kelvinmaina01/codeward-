CREATE TABLE IF NOT EXISTS "account_deletions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connector_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" integer,
	"requested_by" text,
	"tool_name" varchar(100) NOT NULL,
	"use_case" text,
	"notify_email" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"vote_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" integer,
	"created_by" text,
	"provider" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"encrypted_credentials" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"agent_access" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "run_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"repo_id" integer,
	"agent" varchar(100) DEFAULT 'system' NOT NULL,
	"log_type" varchar(50) DEFAULT 'run' NOT NULL,
	"level" varchar(20) DEFAULT 'plain' NOT NULL,
	"ts_ms" bigint NOT NULL,
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type" varchar(20) DEFAULT 'private' NOT NULL,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text,
	"actor_name" varchar(255) NOT NULL,
	"action" text NOT NULL,
	"ip_address" varchar(45),
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"otp" varchar(10),
	"expires_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invited_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD COLUMN IF NOT EXISTS "checkpoint_state" jsonb;--> statement-breakpoint
ALTER TABLE "gordon_events" ADD COLUMN IF NOT EXISTS "integration_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isDeleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint