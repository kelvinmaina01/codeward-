ALTER TABLE "organization" ADD COLUMN "pr_quota_limit" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_price_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "current_period_end" timestamp;