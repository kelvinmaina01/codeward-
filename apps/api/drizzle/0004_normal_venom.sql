CREATE TABLE "agent_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"agent_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"severity" text,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "visibility" varchar(20) DEFAULT 'private' NOT NULL;