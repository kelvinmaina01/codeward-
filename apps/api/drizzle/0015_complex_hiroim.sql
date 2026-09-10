ALTER TABLE "organization" ADD COLUMN "plan_type" varchar(50) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_subscription_id" varchar(255);