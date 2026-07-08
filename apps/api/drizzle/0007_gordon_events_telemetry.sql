CREATE TABLE "gordon_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid,
	"tool_name" text NOT NULL,
	"repo_id" integer,
	"input" jsonb,
	"output_summary" jsonb,
	"success" boolean NOT NULL,
	"error_text" text,
	"required_approval" boolean DEFAULT false NOT NULL,
	"duration_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gordon_events" ADD CONSTRAINT "gordon_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gordon_events" ADD CONSTRAINT "gordon_events_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE set null ON UPDATE no action;